/**
 * Pure Physics Engine & AP Physics C Curriculum Logic for Topic 2.5: Newton's Second Law
 *
 * Strictly aligned with AP Physics C: Mechanics Course Framework V.1 | Page 48:
 * - Learning Objective 2.5.A: Describe the conditions under which a system's velocity changes.
 * - EK 2.5.A.1: Unbalanced forces are a configuration of forces such that the net force exerted on a system is not equal to zero.
 * - EK 2.5.A.2: a_sys = ΣF / m_sys = F_net / m_sys (magnitude proportional to |F_net|, direction identical to F_net).
 * - EK 2.5.A.3: The velocity of a system's center of mass will only change if a nonzero net external force is exerted on that system.
 * - Suggested Skills: 1.B (Quantitative graphs + plotting data), 2.B (Calculate unknown quantity),
 *   2.D (Functional dependence & factors of change), 3.A (Experimental procedures), 3.C (Justify claims).
 */

export const G_ACCEL = 9.81;

export type Newton25Mode =
  | 'unbalanced_track'
  | 'vector_2d'
  | 'modified_atwood'
  | 'com_system';

export type TrackPreset = 'accel_fwd' | 'braking' | 'double_mass' | 'balanced';

export type GraphPlotKind = 'a_vs_f' | 'a_vs_m' | 'a_vs_inv_m' | 'v_vs_t';

export interface Newton25Params {
  mode: Newton25Mode;
  simTimeS: number;

  // Mode 1: Unbalanced Track & Braking Lab (2.5.A.1 & 2.5.A.2)
  trackPreset: TrackPreset;
  cartMassKg: number;      // 1..10 kg
  forwardForceN: number;   // 0..40 N (+x)
  resistForceN: number;    // 0..40 N (-x)
  initialVelMs: number;    // -6..+6 m/s

  // Mode 2: 2D Vector Dynamics (2.5.A.1 & 2.5.A.2 direction proof)
  puckMassKg: number;      // 1..8 kg
  f1MagN: number;          // 0..30 N
  f1AngleDeg: number;      // 0..360 deg
  f2MagN: number;          // 0..30 N
  f2AngleDeg: number;      // 0..360 deg
  puckVx0Ms: number;       // 0..5 m/s

  // Mode 3: Modified Atwood System (2.5.A.2 + Skills 1.B, 2.D, 3.A)
  cart1MassKg: number;     // 0.5..6.0 kg
  hang2MassKg: number;     // 0.2..4.0 kg
  lockTotalMass: boolean;  // Transfer-mass AP lab mode: m1 + m2 = totalSystemMassKg
  totalSystemMassKg: number; // e.g., 4.0 kg constant total mass
  showSystemBoundary: boolean;

  // Mode 4: Multi-Object System COM (2.5.A.3 internal vs external)
  massAKg: number;         // 1..6 kg
  massBKg: number;         // 1..6 kg
  internalSpringImpulseNs: number; // 0..16 N*s internal push-off impulse (cancels internally)
  externalForceN: number;  // -15..+15 N net external force on system
  comV0Ms: number;         // 0..4 m/s initial system COM velocity
  springTriggered: boolean;
}

export interface PlottedDataPoint {
  id: string;
  fNetN: number;
  massKg: number;
  invMassPerKg: number;
  accelMs2: number;
  label: string;
}

export interface ForceEntry25 {
  id: string;
  label: string;
  agent: string;
  fx: number;
  fy: number;
  mag: number;
  angleDeg: number;
  color: string;
  isInternal?: boolean;
}

export interface StrobePoint25 {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface CalcStep25 {
  label: string;
  expression: string;
  result: string;
}

export interface ScalingPrediction25 {
  forceFactor: number;
  massFactor: number;
  baseFNetN: number;
  baseMassKg: number;
  baseAccelMs2: number;
  predictedFNetN: number;
  predictedMassKg: number;
  predictedAccelMs2: number;
  accelFactor: number;
  summaryText: string;
}

export interface ProcedureOption25 {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface ProcedureStepSpec25 {
  id: string;
  prompt: string;
  options: ProcedureOption25[];
}

export interface ClaimItem25 {
  id: string;
  ekCode: string;
  statement: string;
  verdict: 'true' | 'false';
  evidence: string;
}

export interface QuantitativeGraphLayout25 {
  title: string;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xTicks: { value: number; px: number; label: string }[];
  yTicks: { value: number; py: number; label: string }[];
  curvePath: string;
  secondaryCurvePath?: string;
  curveColor: string;
  secondaryColor?: string;
  currentPoint: { x: number; y: number; px: number; py: number; label: string };
  plottedPoints: { id: string; px: number; py: number; label: string }[];
  slopeReadout: string;
  annotationText: string;
  legendPrimary: string;
  legendSecondary?: string;
}

export interface Newton25Evaluation {
  mode: Newton25Mode;
  isUnbalanced: boolean;
  systemMassKg: number;
  fNetX: number;
  fNetY: number;
  fNetMag: number;
  fNetAngleDeg: number;
  axSys: number;
  aySys: number;
  aMagSys: number;
  aAngleDeg: number;

  // Instantaneous kinematics at simTimeS
  posX: number;
  posY: number;
  vxNow: number;
  vyNow: number;
  speedNow: number;
  motionState: 'speeding_up' | 'slowing_down' | 'constant_v' | 'curving' | 'reversing';
  motionStateLabel: string;

  // Modified Atwood specifics
  atwoodTensionN: number;
  atwoodHangingWeightN: number;
  atwoodDropDistM: number;

  // Multi-object COM specifics (EK 2.5.A.3)
  xCmNow: number;
  vCmNow: number;
  aCmNow: number;
  xANow: number;
  xBNow: number;
  vANow: number;
  vBNow: number;
  internalForceDisplayN: number;

  forces: ForceEntry25[];
  strobePoints: StrobePoint25[];
  calcSteps: CalcStep25[];
  verdictHeadline: string;
  verdictDetail: string;
  legendBanner: string;
}

export function normalizeZero(v: number): number {
  return Math.abs(v) < 1e-6 ? 0 : v;
}

export function normalizeAngleDeg(deg: number): number {
  const m = ((deg % 360) + 360) % 360;
  return Math.abs(m - 360) < 1e-6 ? 0 : m;
}

export function createDefaultNewton25Params(mode: Newton25Mode = 'unbalanced_track'): Newton25Params {
  return {
    mode,
    simTimeS: mode === 'com_system' ? 1.1 : mode === 'vector_2d' ? 1.0 : 0.8,
    trackPreset: 'accel_fwd',
    cartMassKg: 4.0,
    forwardForceN: 24.0,
    resistForceN: 8.0,
    initialVelMs: 1.0,

    puckMassKg: 2.5,
    f1MagN: 14.0,
    f1AngleDeg: 15,
    f2MagN: 12.0,
    f2AngleDeg: 105,
    puckVx0Ms: 2.0,

    cart1MassKg: 3.0,
    hang2MassKg: 1.0,
    lockTotalMass: true,
    totalSystemMassKg: 4.0,
    showSystemBoundary: true,

    massAKg: 2.0,
    massBKg: 4.0,
    internalSpringImpulseNs: 8.0,
    externalForceN: 0.0,
    comV0Ms: 2.0,
    springTriggered: true,
  };
}

export function applyTrackPresetParams(prev: Newton25Params, preset: TrackPreset): Newton25Params {
  if (preset === 'accel_fwd') {
    return {
      ...prev,
      trackPreset: preset,
      cartMassKg: 4.0,
      forwardForceN: 24.0,
      resistForceN: 8.0,
      initialVelMs: 1.0,
      simTimeS: 0.8,
    };
  }
  if (preset === 'braking') {
    return {
      ...prev,
      trackPreset: preset,
      cartMassKg: 4.0,
      forwardForceN: 4.0,
      resistForceN: 20.0,
      initialVelMs: 5.0,
      simTimeS: 0.6,
    };
  }
  if (preset === 'double_mass') {
    return {
      ...prev,
      trackPreset: preset,
      cartMassKg: 8.0,
      forwardForceN: 24.0,
      resistForceN: 8.0,
      initialVelMs: 1.0,
      simTimeS: 0.8,
    };
  }
  return {
    ...prev,
    trackPreset: preset,
    cartMassKg: 4.0,
    forwardForceN: 16.0,
    resistForceN: 16.0,
    initialVelMs: 2.5,
    simTimeS: 0.8,
  };
}

export function computeScalingPrediction(
  baseFNetN: number,
  baseMassKg: number,
  forceFactor: number,
  massFactor: number
): ScalingPrediction25 {
  const safeMass = Math.max(0.1, baseMassKg);
  const safeMassFactor = Math.max(0.25, massFactor);
  const baseAccelMs2 = normalizeZero(baseFNetN / safeMass);
  const predictedFNetN = normalizeZero(baseFNetN * forceFactor);
  const predictedMassKg = Number((safeMass * safeMassFactor).toFixed(2));
  const accelFactor = normalizeZero(forceFactor / safeMassFactor);
  const predictedAccelMs2 = normalizeZero(predictedFNetN / predictedMassKg);

  return {
    forceFactor,
    massFactor: safeMassFactor,
    baseFNetN: normalizeZero(baseFNetN),
    baseMassKg: safeMass,
    baseAccelMs2,
    predictedFNetN,
    predictedMassKg,
    predictedAccelMs2,
    accelFactor,
    summaryText: `Scaling F_net by ${forceFactor}x and m_sys by ${safeMassFactor}x scales a_sys by (${forceFactor}/${safeMassFactor}) = ${accelFactor.toFixed(2)}x.`,
  };
}

export function evaluateNewton25(params: Newton25Params): Newton25Evaluation {
  const t = Math.max(0, params.simTimeS);

  // =========================================================================
  // MODE 1: UNBALANCED TRACK & BRAKING LAB (EK 2.5.A.1 & 2.5.A.2)
  // =========================================================================
  if (params.mode === 'unbalanced_track') {
    const m = Math.max(0.5, params.cartMassKg);
    const fNetX = normalizeZero(params.forwardForceN - params.resistForceN);
    const ax = normalizeZero(fNetX / m);
    const isUnbalanced = Math.abs(fNetX) > 1e-3;

    const vxNow = normalizeZero(params.initialVelMs + ax * t);
    const posX = normalizeZero(params.initialVelMs * t + 0.5 * ax * t * t);

    let motionState: Newton25Evaluation['motionState'] = 'constant_v';
    let motionStateLabel = 'CONSTANT VELOCITY (ΣF = 0)';
    if (isUnbalanced) {
      if (Math.abs(vxNow) < 0.05) {
        motionState = 'reversing';
        motionStateLabel = 'TURNING POINT (v = 0, a ≠ 0)';
      } else if (vxNow * ax > 0) {
        motionState = 'speeding_up';
        motionStateLabel = 'SPEEDING UP (a parallel to v)';
      } else {
        motionState = 'slowing_down';
        motionStateLabel = 'SLOWING DOWN (a opposes v)';
      }
    }

    const forces: ForceEntry25[] = [
      {
        id: 'f_fwd',
        label: 'F_drive',
        agent: 'Forward Actuator -> Cart',
        fx: params.forwardForceN,
        fy: 0,
        mag: params.forwardForceN,
        angleDeg: 0,
        color: '#34d399',
      },
      {
        id: 'f_res',
        label: 'F_oppose',
        agent: 'Opposing Brake -> Cart',
        fx: -params.resistForceN,
        fy: 0,
        mag: params.resistForceN,
        angleDeg: 180,
        color: '#fb7185',
      },
      {
        id: 'f_n',
        label: 'F_N',
        agent: 'Track -> Cart',
        fx: 0,
        fy: m * G_ACCEL,
        mag: m * G_ACCEL,
        angleDeg: 90,
        color: '#38bdf8',
      },
      {
        id: 'f_g',
        label: 'F_g',
        agent: 'Earth -> Cart',
        fx: 0,
        fy: -m * G_ACCEL,
        mag: m * G_ACCEL,
        angleDeg: 270,
        color: '#fbbf24',
      },
    ];

    const strobePoints: StrobePoint25[] = [];
    for (let i = 0; i <= 6; i++) {
      const ts = (i / 6) * Math.max(1.2, t);
      strobePoints.push({
        t: ts,
        x: normalizeZero(params.initialVelMs * ts + 0.5 * ax * ts * ts),
        y: 0,
        vx: normalizeZero(params.initialVelMs + ax * ts),
        vy: 0,
      });
    }

    const calcSteps: CalcStep25[] = [
      {
        label: '1. Net External Force (2.5.A.1)',
        expression: `ΣF_x = F_drive - F_oppose = ${params.forwardForceN.toFixed(1)} - ${params.resistForceN.toFixed(1)}`,
        result: `${fNetX >= 0 ? '+' : ''}${fNetX.toFixed(1)} N`,
      },
      {
        label: '2. Newton’s Second Law (2.5.A.2)',
        expression: `a_sys = ΣF_x / m_sys = (${fNetX.toFixed(1)} N) / (${m.toFixed(1)} kg)`,
        result: `${ax >= 0 ? '+' : ''}${ax.toFixed(2)} m/s²`,
      },
      {
        label: '3. Direction Alignment',
        expression: isUnbalanced
          ? `Sign of a_sys (${ax > 0 ? '+x' : '-x'}) matches sign of F_net (${fNetX > 0 ? '+x' : '-x'})`
          : 'Zero net force => a_sys = 0 (v_x remains constant)',
        result: isUnbalanced ? (ax > 0 ? '+x direction' : '-x direction') : 'No acceleration',
      },
      {
        label: `4. Velocity at t = ${t.toFixed(2)} s`,
        expression: `v_x(t) = v_0 + a_sys t = ${params.initialVelMs.toFixed(1)} + (${ax.toFixed(2)})(${t.toFixed(2)})`,
        result: `${vxNow.toFixed(2)} m/s`,
      },
    ];

    return {
      mode: params.mode,
      isUnbalanced,
      systemMassKg: m,
      fNetX,
      fNetY: 0,
      fNetMag: Math.abs(fNetX),
      fNetAngleDeg: fNetX >= 0 ? 0 : 180,
      axSys: ax,
      aySys: 0,
      aMagSys: Math.abs(ax),
      aAngleDeg: ax >= 0 ? 0 : 180,
      posX,
      posY: 0,
      vxNow,
      vyNow: 0,
      speedNow: Math.abs(vxNow),
      motionState,
      motionStateLabel,
      atwoodTensionN: 0,
      atwoodHangingWeightN: 0,
      atwoodDropDistM: 0,
      xCmNow: posX,
      vCmNow: vxNow,
      aCmNow: ax,
      xANow: posX,
      xBNow: posX,
      vANow: vxNow,
      vBNow: vxNow,
      internalForceDisplayN: 0,
      forces,
      strobePoints,
      calcSteps,
      verdictHeadline: isUnbalanced
        ? `UNBALANCED: a_sys = ${ax >= 0 ? '+' : ''}${ax.toFixed(2)} m/s²`
        : 'BALANCED: ΣF_x = 0 => a_sys = 0',
      verdictDetail: isUnbalanced
        ? `F_net = ${fNetX >= 0 ? '+' : ''}${fNetX.toFixed(1)} N on m = ${m.toFixed(1)} kg produces ${motionStateLabel.toLowerCase()}.`
        : `Opposing forces cancel (${params.forwardForceN.toFixed(0)} N vs ${params.resistForceN.toFixed(0)} N); velocity stays ${vxNow.toFixed(1)} m/s.`,
      legendBanner: isUnbalanced
        ? `Newton’s 2nd Law (2.5.A.2): F_net = ${fNetX >= 0 ? '+' : ''}${fNetX.toFixed(1)} N on m = ${m.toFixed(1)} kg -> a_sys = ${ax >= 0 ? '+' : ''}${ax.toFixed(2)} m/s² (${motionStateLabel})`
        : `Balanced Forces (2.5.A.1): ΣF_x = 0 N -> a_sys = 0.00 m/s² and v_x stays constant at ${vxNow.toFixed(1)} m/s`,
    };
  }

  // =========================================================================
  // MODE 2: 2D VECTOR DYNAMICS & DIRECTION ALIGNMENT (EK 2.5.A.1 & 2.5.A.2)
  // =========================================================================
  if (params.mode === 'vector_2d') {
    const m = Math.max(0.5, params.puckMassKg);
    const rad1 = (params.f1AngleDeg * Math.PI) / 180;
    const rad2 = (params.f2AngleDeg * Math.PI) / 180;
    const f1x = normalizeZero(params.f1MagN * Math.cos(rad1));
    const f1y = normalizeZero(params.f1MagN * Math.sin(rad1));
    const f2x = normalizeZero(params.f2MagN * Math.cos(rad2));
    const f2y = normalizeZero(params.f2MagN * Math.sin(rad2));

    const fNetX = normalizeZero(f1x + f2x);
    const fNetY = normalizeZero(f1y + f2y);
    const fNetMag = normalizeZero(Math.hypot(fNetX, fNetY));
    const isUnbalanced = fNetMag > 1e-3;
    const fNetAngleDeg = isUnbalanced ? normalizeAngleDeg((Math.atan2(fNetY, fNetX) * 180) / Math.PI) : 0;

    const ax = normalizeZero(fNetX / m);
    const ay = normalizeZero(fNetY / m);
    const aMag = normalizeZero(fNetMag / m);
    const aAngleDeg = isUnbalanced ? normalizeAngleDeg((Math.atan2(ay, ax) * 180) / Math.PI) : 0;

    const vxNow = normalizeZero(params.puckVx0Ms + ax * t);
    const vyNow = normalizeZero(ay * t);
    const speedNow = Math.hypot(vxNow, vyNow);
    const posX = normalizeZero(params.puckVx0Ms * t + 0.5 * ax * t * t);
    const posY = normalizeZero(0.5 * ay * t * t);

    const forces: ForceEntry25[] = [
      {
        id: 'f1',
        label: 'F_1',
        agent: 'Thruster 1 -> Puck',
        fx: f1x,
        fy: f1y,
        mag: params.f1MagN,
        angleDeg: normalizeAngleDeg(params.f1AngleDeg),
        color: '#34d399',
      },
      {
        id: 'f2',
        label: 'F_2',
        agent: 'Thruster 2 -> Puck',
        fx: f2x,
        fy: f2y,
        mag: params.f2MagN,
        angleDeg: normalizeAngleDeg(params.f2AngleDeg),
        color: '#38bdf8',
      },
    ];

    const strobePoints: StrobePoint25[] = [];
    for (let i = 0; i <= 7; i++) {
      const ts = (i / 7) * Math.max(1.2, t);
      strobePoints.push({
        t: ts,
        x: normalizeZero(params.puckVx0Ms * ts + 0.5 * ax * ts * ts),
        y: normalizeZero(0.5 * ay * ts * ts),
        vx: normalizeZero(params.puckVx0Ms + ax * ts),
        vy: normalizeZero(ay * ts),
      });
    }

    const calcSteps: CalcStep25[] = [
      {
        label: '1. Component Vector Sum',
        expression: `ΣF_x = ${f1x.toFixed(1)} + ${f2x.toFixed(1)} = ${fNetX.toFixed(1)} N · ΣF_y = ${f1y.toFixed(1)} + ${f2y.toFixed(1)} = ${fNetY.toFixed(1)} N`,
        result: `|F_net| = ${fNetMag.toFixed(2)} N`,
      },
      {
        label: '2. Net Force Direction',
        expression: `θ_F = atan2(ΣF_y, ΣF_x) = atan2(${fNetY.toFixed(1)}, ${fNetX.toFixed(1)})`,
        result: `${fNetAngleDeg.toFixed(1)}°`,
      },
      {
        label: '3. Acceleration Magnitude (2.5.A.2)',
        expression: `|a_sys| = |F_net| / m = ${fNetMag.toFixed(2)} / ${m.toFixed(1)}`,
        result: `${aMag.toFixed(2)} m/s²`,
      },
      {
        label: '4. Acceleration Direction Proof',
        expression: `a_x = ${ax.toFixed(2)}, a_y = ${ay.toFixed(2)} => θ_a = θ_F`,
        result: `${aAngleDeg.toFixed(1)}° (Exact Match)`,
      },
    ];

    return {
      mode: params.mode,
      isUnbalanced,
      systemMassKg: m,
      fNetX,
      fNetY,
      fNetMag,
      fNetAngleDeg,
      axSys: ax,
      aySys: ay,
      aMagSys: aMag,
      aAngleDeg,
      posX,
      posY,
      vxNow,
      vyNow,
      speedNow,
      motionState: isUnbalanced ? 'curving' : 'constant_v',
      motionStateLabel: isUnbalanced ? 'a ALWAYS PARALLEL TO F_net' : 'ZERO NET FORCE',
      atwoodTensionN: 0,
      atwoodHangingWeightN: 0,
      atwoodDropDistM: 0,
      xCmNow: posX,
      vCmNow: speedNow,
      aCmNow: aMag,
      xANow: posX,
      xBNow: posX,
      vANow: vxNow,
      vBNow: vyNow,
      internalForceDisplayN: 0,
      forces,
      strobePoints,
      calcSteps,
      verdictHeadline: isUnbalanced
        ? `θ_a = θ_F = ${aAngleDeg.toFixed(0)}° · |a| = ${aMag.toFixed(2)} m/s²`
        : 'BALANCED: |F_net| = 0 N',
      verdictDetail: isUnbalanced
        ? `Velocity v(t) bends toward F_net, while acceleration a_sys always points strictly along F_net (${aAngleDeg.toFixed(1)}°).`
        : 'Forces F_1 and F_2 cancel completely; puck coasts in a straight line at constant velocity.',
      legendBanner: `2D Vector Second Law (2.5.A.2): |F_net| = ${fNetMag.toFixed(1)} N @ ${fNetAngleDeg.toFixed(0)}° -> |a_sys| = ${aMag.toFixed(2)} m/s² @ ${aAngleDeg.toFixed(0)}° (exact co-alignment)`,
    };
  }

  // =========================================================================
  // MODE 3: MODIFIED ATWOOD SYSTEM (EK 2.5.A.2 + SKILLS 1.B, 2.D, 3.A)
  // =========================================================================
  if (params.mode === 'modified_atwood') {
    const m2 = Math.max(0.2, Math.min(params.lockTotalMass ? params.totalSystemMassKg - 0.4 : 4.0, params.hang2MassKg));
    const m1 = params.lockTotalMass
      ? Math.max(0.4, Number((params.totalSystemMassKg - m2).toFixed(2)))
      : Math.max(0.5, params.cart1MassKg);
    const mSys = Number((m1 + m2).toFixed(2));
    const fNetExt = normalizeZero(m2 * G_ACCEL);
    const aSys = normalizeZero(fNetExt / mSys);
    const tensionN = normalizeZero(m1 * aSys);
    const dropDist = normalizeZero(0.5 * aSys * t * t);
    const vNow = normalizeZero(aSys * t);

    const forces: ForceEntry25[] = [
      {
        id: 'fg2',
        label: 'm_2 g',
        agent: 'Earth -> Hanger (External)',
        fx: fNetExt,
        fy: -fNetExt,
        mag: fNetExt,
        angleDeg: 270,
        color: '#fb7185',
        isInternal: false,
      },
      {
        id: 't_cart',
        label: 'T (on Cart)',
        agent: 'String -> Cart (Internal)',
        fx: tensionN,
        fy: 0,
        mag: tensionN,
        angleDeg: 0,
        color: '#38bdf8',
        isInternal: true,
      },
      {
        id: 't_hang',
        label: 'T (on Hanger)',
        agent: 'String -> Hanger (Internal)',
        fx: -tensionN,
        fy: tensionN,
        mag: tensionN,
        angleDeg: 90,
        color: '#38bdf8',
        isInternal: true,
      },
      {
        id: 'fn1',
        label: 'F_N (Cart)',
        agent: 'Track -> Cart (Balanced)',
        fx: 0,
        fy: m1 * G_ACCEL,
        mag: m1 * G_ACCEL,
        angleDeg: 90,
        color: '#34d399',
        isInternal: false,
      },
    ];

    const strobePoints: StrobePoint25[] = [];
    for (let i = 0; i <= 6; i++) {
      const ts = (i / 6) * Math.max(1.0, t);
      strobePoints.push({
        t: ts,
        x: normalizeZero(0.5 * aSys * ts * ts),
        y: normalizeZero(-0.5 * aSys * ts * ts),
        vx: normalizeZero(aSys * ts),
        vy: normalizeZero(-aSys * ts),
      });
    }

    const calcSteps: CalcStep25[] = [
      {
        label: '1. System Mass (Cart + Hanger)',
        expression: `m_sys = m_1 + m_2 = ${m1.toFixed(2)} + ${m2.toFixed(2)}`,
        result: `${mSys.toFixed(2)} kg${params.lockTotalMass ? ' (Locked)' : ''}`,
      },
      {
        label: '2. Net External Force Along String',
        expression: `ΣF_ext = m_2 g = (${m2.toFixed(2)} kg)(9.81 m/s²)`,
        result: `${fNetExt.toFixed(2)} N`,
      },
      {
        label: '3. System Acceleration (2.5.A.2)',
        expression: `a_sys = m_2 g / (m_1 + m_2) = ${fNetExt.toFixed(2)} / ${mSys.toFixed(2)}`,
        result: `${aSys.toFixed(2)} m/s²`,
      },
      {
        label: '4. Internal String Tension (T < m_2 g)',
        expression: `T = m_1 a_sys = (${m1.toFixed(2)})(${aSys.toFixed(2)})`,
        result: `${tensionN.toFixed(2)} N`,
      },
    ];

    return {
      mode: params.mode,
      isUnbalanced: fNetExt > 1e-3,
      systemMassKg: mSys,
      fNetX: fNetExt,
      fNetY: 0,
      fNetMag: fNetExt,
      fNetAngleDeg: 0,
      axSys: aSys,
      aySys: 0,
      aMagSys: aSys,
      aAngleDeg: 0,
      posX: dropDist,
      posY: -dropDist,
      vxNow: vNow,
      vyNow: -vNow,
      speedNow: vNow,
      motionState: 'speeding_up',
      motionStateLabel: params.lockTotalMass
        ? 'CONSTANT-TOTAL-MASS LINEAR LAB'
        : 'MODIFIED ATWOOD ACCELERATION',
      atwoodTensionN: tensionN,
      atwoodHangingWeightN: fNetExt,
      atwoodDropDistM: dropDist,
      xCmNow: dropDist,
      vCmNow: vNow,
      aCmNow: aSys,
      xANow: dropDist,
      xBNow: dropDist,
      vANow: vNow,
      vBNow: -vNow,
      internalForceDisplayN: tensionN,
      forces,
      strobePoints,
      calcSteps,
      verdictHeadline: `a_sys = ${aSys.toFixed(2)} m/s² · T = ${tensionN.toFixed(1)} N < m_2 g`,
      verdictDetail: params.lockTotalMass
        ? `Transferring mass keeps m_sys = ${mSys.toFixed(1)} kg constant, making a_sys strictly linear in m_2 g (slope = ${(1 / mSys).toFixed(3)} kg⁻¹).`
        : `External gravity m_2 g = ${fNetExt.toFixed(1)} N accelerates BOTH masses (m_1 + m_2 = ${mSys.toFixed(1)} kg); internal tension T cancels for the system.`,
      legendBanner: `Modified Atwood (2.5.A.2): a_sys = m_2 g / (m_1 + m_2) = ${aSys.toFixed(2)} m/s² · Internal T = ${tensionN.toFixed(1)} N (< m_2 g = ${fNetExt.toFixed(1)} N)`,
    };
  }

  // =========================================================================
  // MODE 4: MULTI-OBJECT SYSTEM COM & INTERNAL VS EXTERNAL FORCES (EK 2.5.A.3)
  // =========================================================================
  const mA = Math.max(0.5, params.massAKg);
  const mB = Math.max(0.5, params.massBKg);
  const mSys = mA + mB;
  const fExt = normalizeZero(params.externalForceN);
  const aCm = normalizeZero(fExt / mSys);
  const vCmNow = normalizeZero(params.comV0Ms + aCm * t);
  const xCmNow = normalizeZero(params.comV0Ms * t + 0.5 * aCm * t * t);

  // Internal spring push-off occurs at t = 0: equal and opposite internal impulses (-J on A, +J on B)
  // Because mA * dvA + mB * dvB = -J + J = 0, the COM position & velocity are 100% invariant to J!
  const J = params.springTriggered ? params.internalSpringImpulseNs : 0;
  const dvA = normalizeZero(-J / mA);
  const dvB = normalizeZero(J / mB);

  // Initial relative separation around COM: mA * dA0 + mB * dB0 = 0
  // Choose dB0 - dA0 = 1.2 m (resting length between cart centers)
  const restSep = 1.25;
  const dA0 = -(mB / mSys) * restSep;
  const dB0 = (mA / mSys) * restSep;

  const xANow = normalizeZero(xCmNow + dA0 + dvA * t);
  const xBNow = normalizeZero(xCmNow + dB0 + dvB * t);
  const vANow = normalizeZero(vCmNow + dvA);
  const vBNow = normalizeZero(vCmNow + dvB);

  const isUnbalanced = Math.abs(fExt) > 1e-3;
  // Display representative spring force pulse magnitude (J / 0.25s)
  const internalForceDisplayN = params.springTriggered ? normalizeZero(J / 0.25) : 0;

  const forces: ForceEntry25[] = [
    {
      id: 'f_ext',
      label: 'ΣF_ext',
      agent: 'External Pusher -> System',
      fx: fExt,
      fy: 0,
      mag: Math.abs(fExt),
      angleDeg: fExt >= 0 ? 0 : 180,
      color: '#fb7185',
      isInternal: false,
    },
    {
      id: 'f_int_a',
      label: 'F_B on A',
      agent: 'Internal Spring -> Cart A',
      fx: -internalForceDisplayN,
      fy: 0,
      mag: internalForceDisplayN,
      angleDeg: 180,
      color: '#38bdf8',
      isInternal: true,
    },
    {
      id: 'f_int_b',
      label: 'F_A on B',
      agent: 'Internal Spring -> Cart B',
      fx: internalForceDisplayN,
      fy: 0,
      mag: internalForceDisplayN,
      angleDeg: 0,
      color: '#38bdf8',
      isInternal: true,
    },
  ];

  const strobePoints: StrobePoint25[] = [];
  for (let i = 0; i <= 6; i++) {
    const ts = (i / 6) * Math.max(1.2, t);
    strobePoints.push({
      t: ts,
      x: normalizeZero(params.comV0Ms * ts + 0.5 * aCm * ts * ts),
      y: 0,
      vx: normalizeZero(params.comV0Ms + aCm * ts),
      vy: 0,
    });
  }

  const calcSteps: CalcStep25[] = [
    {
      label: '1. Internal Forces Sum to Zero',
      expression: `F_B on A + F_A on B = (-${internalForceDisplayN.toFixed(1)} N) + (+${internalForceDisplayN.toFixed(1)} N)`,
      result: '0.0 N (Cancels)',
    },
    {
      label: '2. System COM Acceleration (2.5.A.3)',
      expression: `a_cm = ΣF_ext / (m_A + m_B) = (${fExt.toFixed(1)} N) / (${mSys.toFixed(1)} kg)`,
      result: `${aCm >= 0 ? '+' : ''}${aCm.toFixed(2)} m/s²`,
    },
    {
      label: `3. COM Velocity at t = ${t.toFixed(2)} s`,
      expression: `v_cm(t) = v_cm,0 + a_cm t = ${params.comV0Ms.toFixed(1)} + (${aCm.toFixed(2)})(${t.toFixed(2)})`,
      result: `${vCmNow.toFixed(2)} m/s`,
    },
    {
      label: '4. Weighted Cart Check',
      expression: `(m_A v_A + m_B v_B)/(m_A + m_B) = (${(mA * vANow + mB * vBNow).toFixed(1)}) / ${mSys.toFixed(1)}`,
      result: `${((mA * vANow + mB * vBNow) / mSys).toFixed(2)} m/s (= v_cm)`,
    },
  ];

  return {
    mode: params.mode,
    isUnbalanced,
    systemMassKg: mSys,
    fNetX: fExt,
    fNetY: 0,
    fNetMag: Math.abs(fExt),
    fNetAngleDeg: fExt >= 0 ? 0 : 180,
    axSys: aCm,
    aySys: 0,
    aMagSys: Math.abs(aCm),
    aAngleDeg: aCm >= 0 ? 0 : 180,
    posX: xCmNow,
    posY: 0,
    vxNow: vCmNow,
    vyNow: 0,
    speedNow: Math.abs(vCmNow),
    motionState: isUnbalanced ? 'speeding_up' : 'constant_v',
    motionStateLabel: isUnbalanced
      ? 'EXTERNAL FORCE ACCELERATES COM'
      : 'INTERNAL SPRING: v_cm UNCHANGED!',
    atwoodTensionN: 0,
    atwoodHangingWeightN: 0,
    atwoodDropDistM: 0,
    xCmNow,
    vCmNow,
    aCmNow: aCm,
    xANow,
    xBNow,
    vANow,
    vBNow,
    internalForceDisplayN,
    forces,
    strobePoints,
    calcSteps,
    verdictHeadline: isUnbalanced
      ? `ΣF_ext = ${fExt >= 0 ? '+' : ''}${fExt.toFixed(1)} N => a_cm = ${aCm >= 0 ? '+' : ''}${aCm.toFixed(2)} m/s²`
      : `ΣF_ext = 0 => v_cm STAYS ${vCmNow.toFixed(1)} m/s`,
    verdictDetail: isUnbalanced
      ? `Only the external force (${fExt.toFixed(1)} N) changes v_cm; internal spring separation (${J.toFixed(0)} N·s) leaves a_cm strictly unchanged.`
      : `Internal spring blasts Cart A (${vANow.toFixed(1)} m/s) & Cart B (${vBNow.toFixed(1)} m/s) apart, yet v_cm stays constant at ${vCmNow.toFixed(1)} m/s!`,
    legendBanner: isUnbalanced
      ? `System COM (2.5.A.3): ΣF_ext = ${fExt >= 0 ? '+' : ''}${fExt.toFixed(1)} N changes v_cm at a_cm = ${aCm.toFixed(2)} m/s² regardless of internal spring`
      : `System COM Invariance (2.5.A.3): Internal spring fires carts apart, but ΣF_ext = 0 keeps v_cm strictly constant at ${vCmNow.toFixed(1)} m/s`,
  };
}

/**
 * Skill 1.B: Build quantitative scaled SVG graph layout with units, ticks, theoretical curve,
 * current live marker, and student-plotted experimental data points.
 */
export function buildQuantitativeGraphLayout25(
  params: Newton25Params,
  evaluation: Newton25Evaluation,
  plotKind: GraphPlotKind,
  plottedPoints: PlottedDataPoint[],
  width = 278,
  height = 148
): QuantitativeGraphLayout25 {
  const padL = 38;
  const padR = 14;
  const padT = 22;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const mapX = (val: number, xMin: number, xMax: number) =>
    padL + ((val - xMin) / Math.max(1e-6, xMax - xMin)) * plotW;
  const mapY = (val: number, yMin: number, yMax: number) =>
    padT + (1 - (val - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

  const makeTicks = (min: number, max: number, count: number, isX: boolean, digits = 1) => {
    const ticks: { value: number; px: number; py: number; label: string }[] = [];
    for (let i = 0; i <= count; i++) {
      const value = min + ((max - min) * i) / count;
      ticks.push({
        value,
        px: isX ? mapX(value, min, max) : padL,
        py: isX ? height - padB : mapY(value, min, max),
        label: Math.abs(value) < 1e-6 ? '0' : value.toFixed(digits),
      });
    }
    return ticks;
  };

  const mSys = Math.max(0.5, evaluation.systemMassKg);
  const fMag = evaluation.fNetMag;
  const aMag = evaluation.aMagSys;

  if (plotKind === 'a_vs_f') {
    const xMin = 0;
    const xMax = Math.max(40, Math.ceil((fMag + 4) / 10) * 10);
    const yMax = Math.max(8, Math.ceil((xMax / mSys) / 2) * 2);
    const yMin = 0;

    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const fx = xMin + ((xMax - xMin) * i) / 24;
      const ay = fx / mSys;
      const px = mapX(fx, xMin, xMax);
      const py = mapY(Math.min(yMax, ay), yMin, yMax);
      pts.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
    }

    const clampedX = Math.max(xMin, Math.min(xMax, fMag));
    const clampedY = Math.max(yMin, Math.min(yMax, aMag));

    return {
      title: 'Acceleration vs. Net Force (Skill 1.B)',
      xLabel: '|F_net| (N)',
      yLabel: '|a| (m/s²)',
      xUnit: 'N',
      yUnit: 'm/s²',
      xMin,
      xMax,
      yMin,
      yMax,
      xTicks: makeTicks(xMin, xMax, 4, true, 0).map(t => ({ value: t.value, px: t.px, label: t.label })),
      yTicks: makeTicks(yMin, yMax, 4, false, 0).map(t => ({ value: t.value, py: t.py, label: t.label })),
      curvePath: pts.join(' '),
      curveColor: '#34d399',
      currentPoint: {
        x: clampedX,
        y: clampedY,
        px: mapX(clampedX, xMin, xMax),
        py: mapY(clampedY, yMin, yMax),
        label: `(${fMag.toFixed(1)} N, ${aMag.toFixed(2)} m/s²)`,
      },
      plottedPoints: plottedPoints.map(p => ({
        id: p.id,
        px: mapX(Math.max(xMin, Math.min(xMax, p.fNetN)), xMin, xMax),
        py: mapY(Math.max(yMin, Math.min(yMax, p.accelMs2)), yMin, yMax),
        label: p.label,
      })),
      slopeReadout: `Slope = 1/m_sys = ${(1 / mSys).toFixed(3)} kg⁻¹`,
      annotationText: `Direct linear proportionality: a = (1/${mSys.toFixed(1)} kg)·F_net`,
      legendPrimary: `m = ${mSys.toFixed(1)} kg`,
    };
  }

  if (plotKind === 'a_vs_m') {
    const xMin = 0.5;
    const xMax = 10.0;
    const refF = Math.max(4, fMag);
    const yMin = 0;
    const yMax = Math.max(12, Math.min(40, Math.ceil((refF / 1.0) / 4) * 4));

    const pts: string[] = [];
    for (let i = 0; i <= 32; i++) {
      const mx = xMin + ((xMax - xMin) * i) / 32;
      const ay = Math.min(yMax, refF / mx);
      const px = mapX(mx, xMin, xMax);
      const py = mapY(ay, yMin, yMax);
      pts.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
    }

    const clampedX = Math.max(xMin, Math.min(xMax, mSys));
    const clampedY = Math.max(yMin, Math.min(yMax, aMag));

    return {
      title: 'Acceleration vs. System Mass (Inverse)',
      xLabel: 'm_sys (kg)',
      yLabel: '|a| (m/s²)',
      xUnit: 'kg',
      yUnit: 'm/s²',
      xMin,
      xMax,
      yMin,
      yMax,
      xTicks: [1, 4, 7, 10].map(v => ({ value: v, px: mapX(v, xMin, xMax), label: `${v}` })),
      yTicks: makeTicks(yMin, yMax, 4, false, 0).map(t => ({ value: t.value, py: t.py, label: t.label })),
      curvePath: pts.join(' '),
      curveColor: '#fbbf24',
      currentPoint: {
        x: clampedX,
        y: clampedY,
        px: mapX(clampedX, xMin, xMax),
        py: mapY(clampedY, yMin, yMax),
        label: `(${mSys.toFixed(1)} kg, ${aMag.toFixed(2)} m/s²)`,
      },
      plottedPoints: plottedPoints.map(p => ({
        id: p.id,
        px: mapX(Math.max(xMin, Math.min(xMax, p.massKg)), xMin, xMax),
        py: mapY(Math.max(yMin, Math.min(yMax, p.accelMs2)), yMin, yMax),
        label: p.label,
      })),
      slopeReadout: `Hyperbola: a = ${refF.toFixed(1)} / m_sys`,
      annotationText: 'Curved inverse relationship (use 1/m to linearize!)',
      legendPrimary: `F_net = ${refF.toFixed(1)} N`,
    };
  }

  if (plotKind === 'a_vs_inv_m') {
    const xMin = 0;
    const xMax = 1.2;
    const refF = Math.max(4, fMag);
    const yMin = 0;
    const yMax = Math.max(10, Math.ceil((refF * xMax) / 4) * 4);

    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const invM = xMin + ((xMax - xMin) * i) / 24;
      const ay = Math.min(yMax, refF * invM);
      pts.push(`${i === 0 ? 'M' : 'L'}${mapX(invM, xMin, xMax).toFixed(1)},${mapY(ay, yMin, yMax).toFixed(1)}`);
    }

    const invMNow = 1 / mSys;
    const clampedX = Math.max(xMin, Math.min(xMax, invMNow));
    const clampedY = Math.max(yMin, Math.min(yMax, aMag));

    return {
      title: 'Linearized: a vs. 1/m_sys (Slope = F_net)',
      xLabel: '1/m_sys (kg⁻¹)',
      yLabel: '|a| (m/s²)',
      xUnit: 'kg⁻¹',
      yUnit: 'm/s²',
      xMin,
      xMax,
      yMin,
      yMax,
      xTicks: [0, 0.4, 0.8, 1.2].map(v => ({ value: v, px: mapX(v, xMin, xMax), label: v.toFixed(1) })),
      yTicks: makeTicks(yMin, yMax, 4, false, 0).map(t => ({ value: t.value, py: t.py, label: t.label })),
      curvePath: pts.join(' '),
      curveColor: '#38bdf8',
      currentPoint: {
        x: clampedX,
        y: clampedY,
        px: mapX(clampedX, xMin, xMax),
        py: mapY(clampedY, yMin, yMax),
        label: `(${invMNow.toFixed(2)} kg⁻¹, ${aMag.toFixed(2)})`,
      },
      plottedPoints: plottedPoints.map(p => ({
        id: p.id,
        px: mapX(Math.max(xMin, Math.min(xMax, p.invMassPerKg)), xMin, xMax),
        py: mapY(Math.max(yMin, Math.min(yMax, p.accelMs2)), yMin, yMax),
        label: p.label,
      })),
      slopeReadout: `Linear Slope = F_net = ${refF.toFixed(1)} N`,
      annotationText: 'AP Linearization: straight line through (0, 0) proves a ∝ 1/m',
      legendPrimary: `Slope = ${refF.toFixed(1)} N`,
    };
  }

  // 'v_vs_t': Velocity vs time (shows v_cm vs individual carts in com_system, or v(t) in track/atwood/2D)
  const tMax = 2.4;
  const v0 = params.mode === 'com_system' ? params.comV0Ms : params.mode === 'modified_atwood' ? 0 : params.mode === 'vector_2d' ? params.puckVx0Ms : params.initialVelMs;
  const acc = params.mode === 'com_system' ? evaluation.aCmNow : params.mode === 'vector_2d' ? evaluation.aMagSys : evaluation.axSys;
  const vEnd = v0 + acc * tMax;
  const allY = [v0, vEnd, 0];
  if (params.mode === 'com_system') {
    allY.push(evaluation.vANow, evaluation.vBNow);
  }
  const yMin = Math.floor(Math.min(...allY) - 2);
  const yMax = Math.ceil(Math.max(...allY) + 2);

  const primaryPts: string[] = [];
  const secondaryPts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const ti = (tMax * i) / 24;
    const vi = v0 + acc * ti;
    primaryPts.push(`${i === 0 ? 'M' : 'L'}${mapX(ti, 0, tMax).toFixed(1)},${mapY(vi, yMin, yMax).toFixed(1)}`);
    if (params.mode === 'com_system') {
      const vAi = vi + (evaluation.vANow - evaluation.vCmNow);
      secondaryPts.push(`${i === 0 ? 'M' : 'L'}${mapX(ti, 0, tMax).toFixed(1)},${mapY(vAi, yMin, yMax).toFixed(1)}`);
    }
  }

  const clampedT = Math.max(0, Math.min(tMax, params.simTimeS));
  const currentV = v0 + acc * clampedT;

  return {
    title: params.mode === 'com_system' ? 'v_cm(t) vs. Cart A Velocity (EK 2.5.A.3)' : 'System Velocity v(t) (Slope = a_sys)',
    xLabel: 'Time t (s)',
    yLabel: 'v (m/s)',
    xUnit: 's',
    yUnit: 'm/s',
    xMin: 0,
    xMax: tMax,
    yMin,
    yMax,
    xTicks: [0, 0.8, 1.6, 2.4].map(v => ({ value: v, px: mapX(v, 0, tMax), label: v.toFixed(1) })),
    yTicks: makeTicks(yMin, yMax, 3, false, 0).map(t => ({ value: t.value, py: t.py, label: t.label })),
    curvePath: primaryPts.join(' '),
    secondaryCurvePath: params.mode === 'com_system' ? secondaryPts.join(' ') : undefined,
    curveColor: '#34d399',
    secondaryColor: '#38bdf8',
    currentPoint: {
      x: clampedT,
      y: currentV,
      px: mapX(clampedT, 0, tMax),
      py: mapY(currentV, yMin, yMax),
      label: `t=${clampedT.toFixed(1)}s, v=${currentV.toFixed(1)}`,
    },
    plottedPoints: [],
    slopeReadout: `dv/dt = a_sys = ${acc >= 0 ? '+' : ''}${acc.toFixed(2)} m/s²`,
    annotationText:
      params.mode === 'com_system'
        ? 'v_cm slope depends ONLY on ΣF_ext, never internal spring'
        : `Constant net force produces constant slope dv/dt = ${acc.toFixed(2)} m/s²`,
    legendPrimary: params.mode === 'com_system' ? 'v_cm(t)' : 'v_sys(t)',
    legendSecondary: params.mode === 'com_system' ? 'v_A(t)' : undefined,
  };
}

/**
 * Skill 3.A: Experimental Procedure Design Protocol for verifying Newton's Second Law
 */
export const EXPERIMENTAL_PROCEDURE_3A: ProcedureStepSpec25[] = [
  {
    id: 'step-control-mass',
    prompt: '1. To test a ∝ F_net using a Modified Atwood machine, how must you vary the hanging force m_2 g?',
    options: [
      {
        id: 'transfer',
        label: 'Transfer slotted masses from the cart onto the hanger (m_1 + m_2 = const)',
        correct: true,
        feedback: 'Correct! Moving mass from cart to hanger increases F_net = m_2 g while holding total system mass m_sys = m_1 + m_2 strictly constant.',
      },
      {
        id: 'add_new',
        label: 'Add new extra masses from the table directly onto the hanger',
        correct: false,
        feedback: 'Confounded variable! Adding external mass increases BOTH F_net = m_2 g AND total mass m_1 + m_2, making a vs. m_2 g curve non-linearly.',
      },
    ],
  },
  {
    id: 'step-measure-a',
    prompt: '2. Which instrumentation directly measures the system acceleration a_sys with minimal friction error?',
    options: [
      {
        id: 'motion_sensor',
        label: 'Sonic motion detector / photogate pulley logging v(t) slope = a_sys',
        correct: true,
        feedback: 'Correct! Fitting the linear slope of velocity vs. time (a = dv/dt) over multiple trials minimizes single-stopwatch reaction error.',
      },
      {
        id: 'spring_scale_only',
        label: 'A single stationary spring scale held at rest before release',
        correct: false,
        feedback: 'A stationary reading measures static weight m_2 g, not dynamic acceleration (and while moving, string tension T < m_2 g).',
      },
    ],
  },
  {
    id: 'step-linearize',
    prompt: '3. Next, keeping F_net constant while varying m_sys, what graph yields a straight line whose slope equals F_net?',
    options: [
      {
        id: 'a_vs_inv_m',
        label: 'Plot acceleration a_sys on the vertical axis vs. 1/m_sys on the horizontal axis',
        correct: true,
        feedback: 'Correct! Since a_sys = F_net · (1/m_sys), plotting a vs. 1/m_sys linearizes the hyperbola with slope = F_net.',
      },
      {
        id: 'a_vs_m_linear',
        label: 'Plot acceleration a_sys vs. m_sys and measure its constant slope',
        correct: false,
        feedback: 'a_sys vs. m_sys is a curved inverse hyperbola (a ∝ 1/m), so its slope is not constant.',
      },
    ],
  },
];

/**
 * Skill 3.C: AP Physics C Claim Justification Bank (EK 2.5.A.1 – 2.5.A.3)
 */
export const AP_CLAIMS_25: ClaimItem25[] = [
  {
    id: 'claim-braking',
    ekCode: '2.5.A.2',
    statement: 'If a cart moves in the +x direction while its net force points in the -x direction, the cart’s acceleration points in the +x direction until it stops.',
    verdict: 'false',
    evidence: 'False (EK 2.5.A.2): Acceleration ALWAYS points in the exact same direction as the net force (-x), even while velocity is still +x. Opposing v and a simply means the cart slows down.',
  },
  {
    id: 'claim-atwood-tension',
    ekCode: '2.5.A.2',
    statement: 'In a frictionless Modified Atwood machine (cart m_1 + hanging mass m_2), the string tension T is strictly less than the hanging weight m_2 g during acceleration.',
    verdict: 'true',
    evidence: 'True (EK 2.5.A.2): Because m_2 accelerates downward (a > 0), m_2 g - T = m_2 a > 0, so T = m_2(g - a) = m_1 m_2 g / (m_1 + m_2) < m_2 g.',
  },
  {
    id: 'claim-internal-com',
    ekCode: '2.5.A.3',
    statement: 'When a compressed spring between two carts on a frictionless horizontal track suddenly releases with ΣF_ext = 0, the system’s center-of-mass velocity v_cm changes rapidly.',
    verdict: 'false',
    evidence: 'False (EK 2.5.A.3): The spring exerts equal-and-opposite internal forces that cancel within the two-cart system. Without a nonzero net external force, a_cm = 0 and v_cm remains strictly constant.',
  },
  {
    id: 'claim-scaling',
    ekCode: '2.5.A.2',
    statement: 'Tripling the net external force on a system while simultaneously doubling the system’s mass multiplies its acceleration magnitude by 1.5.',
    verdict: 'true',
    evidence: 'True (Skill 2.D & EK 2.5.A.2): From a_sys = F_net / m_sys, scaling F_net -> 3 F_net and m_sys -> 2 m_sys yields a’ = (3/2) a_sys = 1.5 a_sys.',
  },
];
