/**
 * Pure Physics Engine & AP Physics C Curriculum Logic for Unit 2, Topic 2.7:
 * Kinetic and Static Friction (Course Framework V.1, Pages 53–54)
 *
 * Covers:
 * - 2.7.A Kinetic Friction: relative motion direction (2.7.A.1.i), contact-area independence (2.7.A.1.ii),
 *   |F_{f,k}| = |μ_k F_N| (2.7.A.2), material dependence (2.7.A.2.i), normal force definition (2.7.A.2.ii).
 * - 2.7.B Static Friction: no relative motion (2.7.B.1), self-adjusting value & direction |F_{f,s}| <= |μ_s F_N| (2.7.B.2),
 *   slipping/sliding onset (2.7.B.2.i), maximum static friction F_{f,s,max} = μ_s F_N (2.7.B.2.ii), μ_s > μ_k (2.7.B.3).
 * - Suggested Skills: 1.B (Quantitative graphs + data plotting), 2.A (Symbolic derivations),
 *   2.B (Quantitative calculation pathways with units), 3.A (Experimental procedures), 3.B (AP claims).
 */

export const GRAVITY_G = 9.81;

export type Friction27Mode =
  | 'horizontal_pull'
  | 'incline_ramp'
  | 'stacked_blocks'
  | 'area_surface_compare';

export type MaterialPairId =
  | 'wood_wood'
  | 'rubber_asphalt'
  | 'steel_steel'
  | 'teflon_steel'
  | 'waxed_snow';

export type BlockOrientation = 'wide' | 'narrow';

export interface FrictionMaterialSpec {
  id: MaterialPairId;
  name: string;
  shortName: string;
  muS: number;
  muK: number;
  trackColorHex: number;
  trackAccentHex: number;
  blockColorHex: number;
  notes: string;
}

export const FRICTION_MATERIALS: Record<MaterialPairId, FrictionMaterialSpec> = {
  wood_wood: {
    id: 'wood_wood',
    name: 'Oak Wood on Maple Track',
    shortName: 'Wood / Wood',
    muS: 0.50,
    muK: 0.30,
    trackColorHex: 0x7c5333,
    trackAccentHex: 0x5c3a21,
    blockColorHex: 0xb47844,
    notes: 'Classic AP classroom friction block pair (μ_s = 0.50, μ_k = 0.30).',
  },
  rubber_asphalt: {
    id: 'rubber_asphalt',
    name: 'Rubber Tire on Dry Asphalt',
    shortName: 'Rubber / Asphalt',
    muS: 0.90,
    muK: 0.65,
    trackColorHex: 0x334155,
    trackAccentHex: 0x1e293b,
    blockColorHex: 0x1f2937,
    notes: 'High-grip traction pair showing why ABS braking avoids kinetic slip (μ_s = 0.90 > μ_k = 0.65).',
  },
  steel_steel: {
    id: 'steel_steel',
    name: 'Dry Steel on Machined Steel',
    shortName: 'Steel / Steel',
    muS: 0.60,
    muK: 0.42,
    trackColorHex: 0x475569,
    trackAccentHex: 0x334155,
    blockColorHex: 0x94a3b8,
    notes: 'Metallic contact pair with strong cold-weld static asperities (μ_s = 0.60, μ_k = 0.42).',
  },
  teflon_steel: {
    id: 'teflon_steel',
    name: 'Teflon (PTFE) on Polished Steel',
    shortName: 'Teflon / Steel',
    muS: 0.14,
    muK: 0.08,
    trackColorHex: 0x64748b,
    trackAccentHex: 0x475569,
    blockColorHex: 0xe2e8f0,
    notes: 'Ultra-low-friction fluoropolymer contact (μ_s = 0.14, μ_k = 0.08).',
  },
  waxed_snow: {
    id: 'waxed_snow',
    name: 'Waxed Ski on Packed Snow',
    shortName: 'Waxed / Snow',
    muS: 0.20,
    muK: 0.12,
    trackColorHex: 0x93c5fd,
    trackAccentHex: 0x60a5fa,
    blockColorHex: 0x0f766e,
    notes: 'Low-friction winter glide pair (μ_s = 0.20, μ_k = 0.12).',
  },
};

export interface LabTrialPoint {
  id: string;
  massKg: number;
  normalForceN: number;
  maxStaticFrictionN: number;
  kineticFrictionN: number;
  materialId: MaterialPairId;
  orientation: BlockOrientation;
}

export interface Friction27Params {
  mode: Friction27Mode;
  materialId: MaterialPairId;
  muS: number;
  muK: number;
  gMs2: number;

  // Mode 1: Horizontal / Angled Pull & Breakaway
  massKg: number;
  appliedForceN: number;
  pullAngleDeg: number; // -30 (push down) to +45 (pull up)
  orientation: BlockOrientation; // 'wide' (0.06 m^2) vs 'narrow' (0.02 m^2)
  autoRampActive: boolean;

  // Mode 2: Inclined Plane Critical Angle & Uphill Launch
  inclineMassKg: number;
  inclineAngleDeg: number; // 0 to 60 deg
  inclineInitialVelocityMs: number; // 0 (rest) or +5 m/s (launched uphill)

  // Mode 3: Stacked Two-Block System (Relative Motion & 3rd Law)
  bottomMassKg: number;
  topMassKg: number;
  stackPullForceN: number;
  topMuS: number;
  topMuK: number;
  floorMuK: number;

  // Mode 4: Area & Surface Material Side-by-Side Comparison
  compareMassKg: number;
  comparePullForceN: number;
  compareLaneBMaterialId: MaterialPairId;
}

export const DEFAULT_FRICTION27_PARAMS: Friction27Params = {
  mode: 'horizontal_pull',
  materialId: 'wood_wood',
  muS: 0.50,
  muK: 0.30,
  gMs2: GRAVITY_G,

  massKg: 4.0,
  appliedForceN: 16.0,
  pullAngleDeg: 0,
  orientation: 'wide',
  autoRampActive: false,

  inclineMassKg: 4.0,
  inclineAngleDeg: 22,
  inclineInitialVelocityMs: 0,

  bottomMassKg: 6.0,
  topMassKg: 2.0,
  stackPullForceN: 28.0,
  topMuS: 0.50,
  topMuK: 0.30,
  floorMuK: 0.0,

  compareMassKg: 4.0,
  comparePullForceN: 26.0,
  compareLaneBMaterialId: 'wood_wood',
};

export interface HorizontalPullEval {
  effectiveAppliedForceN: number;
  fxAppliedN: number;
  fyAppliedN: number;
  weightN: number;
  normalForceN: number;
  isLiftedOff: boolean;
  maxStaticFrictionN: number;
  kineticFrictionN: number;
  regime: 'static' | 'breakaway' | 'kinetic' | 'liftoff';
  actualFrictionN: number; // magnitude
  signedFrictionN: number; // -left, +right
  netForceXN: number;
  accelMs2: number;
  contactAreaM2: number;
  contactPressurePa: number;
  // Kinematic playback values at time t
  displacementM: number;
  velocityMs: number;
  rampBreakawayTimeS: number;
}

export interface InclineEval {
  weightN: number;
  fgParallelN: number; // downhill magnitude mg sinθ
  fgPerpN: number; // into ramp mg cosθ
  normalForceN: number;
  maxStaticFrictionN: number;
  kineticFrictionN: number;
  criticalAngleDeg: number;
  isAboveCritical: boolean;
  // Instantaneous state at time t (positive along ramp = uphill)
  regime: 'static_rest' | 'kinetic_uphill' | 'static_locked_peak' | 'kinetic_downhill';
  signedFrictionN: number; // + uphill, - downhill
  signedAccelMs2: number; // + uphill, - downhill
  velocityMs: number;
  displacementM: number; // relative to center of ramp
  stopTimeUphillS: number;
}

export interface StackedBlocksEval {
  totalMassKg: number;
  normalTopN: number;
  normalFloorN: number;
  maxStaticTopN: number;
  kineticTopN: number;
  floorFrictionN: number;
  slipThresholdPullN: number;
  isSlipping: boolean;
  regime: 'static_together' | 'kinetic_slipping' | 'stationary';
  // Force of friction on top block (+right/forward!) and Newton 3rd law pair on bottom sled (-left!)
  frictionOnTopN: number;
  frictionOnBottomFromTopN: number;
  accelBottomMs2: number;
  accelTopMs2: number;
  relativeAccelTopVsBottomMs2: number; // negative when top slips backward relative to sled
  // Animated positions at time t
  bottomDisplacementM: number;
  topDisplacementM: number;
  topRelativeOffsetM: number; // clamped to sled length in visual
  velocityBottomMs: number;
  velocityTopMs: number;
}

export interface CompareLaneEval {
  label: string;
  material: FrictionMaterialSpec;
  orientation: BlockOrientation;
  contactAreaM2: number;
  normalForceN: number;
  contactPressurePa: number;
  maxStaticFrictionN: number;
  kineticFrictionN: number;
  regime: 'static' | 'kinetic';
  actualFrictionN: number;
  accelMs2: number;
  displacementM: number;
  velocityMs: number;
}

export interface AreaSurfaceCompareEval {
  laneA: CompareLaneEval;
  laneB: CompareLaneEval;
  sameMaterial: boolean;
  pressureRatioBOverA: number;
  frictionDifferenceN: number;
}

export interface Friction27Evaluation {
  simTimeS: number;
  horizontal: HorizontalPullEval;
  incline: InclineEval;
  stacked: StackedBlocksEval;
  compare: AreaSurfaceCompareEval;
  statusBanner: string;
}

export function getContactAreaM2(orientation: BlockOrientation): number {
  return orientation === 'wide' ? 0.06 : 0.02;
}

/**
 * Evaluate Mode 1: Horizontal / Angled Pull & Breakaway (2.7.A & 2.7.B)
 */
export function evaluateHorizontalPull(
  params: Friction27Params,
  simTimeS: number,
  isPlaying: boolean
): HorizontalPullEval {
  const m = Math.max(0.5, params.massKg);
  const g = params.gMs2;
  const muS = Math.max(0.02, params.muS);
  const muK = Math.max(0.01, Math.min(muS, params.muK));
  const phiRad = (params.pullAngleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phiRad);
  const sinPhi = Math.sin(phiRad);

  const weightN = m * g;
  const contactAreaM2 = getContactAreaM2(params.orientation);

  // Compute reference breakaway applied force for auto-ramp scaling
  // At breakaway: F cosφ = μ_s (mg - F sinφ) => F = μ_s mg / (cosφ + μ_s sinφ)
  const breakDenom = Math.max(0.15, cosPhi + muS * sinPhi);
  const breakawayAppForceN = (muS * weightN) / breakDenom;
  const rampRateNPerS = Math.max(4.0, breakawayAppForceN / 2.2);
  const rampBreakawayTimeS = breakawayAppForceN / rampRateNPerS;

  let effectiveAppliedForceN = Math.max(0, params.appliedForceN);
  if (params.autoRampActive && (isPlaying || simTimeS > 0.001)) {
    const maxRampForce = Math.min(160, breakawayAppForceN * 1.55);
    effectiveAppliedForceN = Math.min(maxRampForce, rampRateNPerS * Math.max(0, simTimeS));
  }

  const fxAppliedN = effectiveAppliedForceN * cosPhi;
  const fyAppliedN = effectiveAppliedForceN * sinPhi;
  const rawNormal = weightN - fyAppliedN;
  const isLiftedOff = rawNormal <= 0.01;
  const normalForceN = Math.max(0, rawNormal);

  const maxStaticFrictionN = muS * normalForceN;
  const kineticFrictionN = muK * normalForceN;
  const contactPressurePa = normalForceN / contactAreaM2;

  let regime: HorizontalPullEval['regime'] = 'static';
  let actualFrictionN = 0;
  let signedFrictionN = 0;
  let netForceXN = 0;
  let accelMs2 = 0;

  if (isLiftedOff) {
    regime = 'liftoff';
    actualFrictionN = 0;
    signedFrictionN = 0;
    netForceXN = fxAppliedN;
    accelMs2 = netForceXN / m;
  } else if (fxAppliedN <= maxStaticFrictionN + 1e-6) {
    // Check if right at threshold
    regime =
      maxStaticFrictionN > 0.1 && Math.abs(fxAppliedN - maxStaticFrictionN) < 0.15
        ? 'breakaway'
        : 'static';
    actualFrictionN = fxAppliedN;
    signedFrictionN = -actualFrictionN;
    netForceXN = 0;
    accelMs2 = 0;
  } else {
    regime = 'kinetic';
    actualFrictionN = kineticFrictionN;
    signedFrictionN = -kineticFrictionN;
    netForceXN = fxAppliedN - kineticFrictionN;
    accelMs2 = netForceXN / m;
  }

  // Compute deterministic animated kinematics
  let displacementM = 0;
  let velocityMs = 0;
  if (simTimeS > 0) {
    if (params.autoRampActive) {
      if (simTimeS > rampBreakawayTimeS) {
        const dtSlide = simTimeS - rampBreakawayTimeS;
        // Integrate approximate acceleration after breakaway cleanly
        const aBreak =
          (breakawayAppForceN * cosPhi - muK * Math.max(0, weightN - breakawayAppForceN * sinPhi)) / m;
        const aNow = accelMs2;
        const aAvg = Math.max(0, 0.5 * (aBreak + aNow));
        velocityMs = aAvg * dtSlide;
        displacementM = 0.5 * aAvg * dtSlide * dtSlide;
      }
    } else if (accelMs2 > 0) {
      velocityMs = accelMs2 * simTimeS;
      displacementM = 0.5 * accelMs2 * simTimeS * simTimeS;
    }
  }

  return {
    effectiveAppliedForceN,
    fxAppliedN,
    fyAppliedN,
    weightN,
    normalForceN,
    isLiftedOff,
    maxStaticFrictionN,
    kineticFrictionN,
    regime,
    actualFrictionN,
    signedFrictionN,
    netForceXN,
    accelMs2,
    contactAreaM2,
    contactPressurePa,
    displacementM,
    velocityMs,
    rampBreakawayTimeS,
  };
}

/**
 * Evaluate Mode 2: Inclined Plane Critical Angle & Uphill Reversal (2.7.A.1.i, 2.7.A.2.ii, 2.7.B.2)
 */
export function evaluateInclineRamp(params: Friction27Params, simTimeS: number): InclineEval {
  const m = Math.max(0.5, params.inclineMassKg);
  const g = params.gMs2;
  const muS = Math.max(0.02, params.muS);
  const muK = Math.max(0.01, Math.min(muS, params.muK));
  const thetaDeg = Math.max(0, Math.min(60, params.inclineAngleDeg));
  const thetaRad = (thetaDeg * Math.PI) / 180;

  const weightN = m * g;
  const fgParallelN = weightN * Math.sin(thetaRad);
  const fgPerpN = weightN * Math.cos(thetaRad);
  const normalForceN = fgPerpN;
  const maxStaticFrictionN = muS * normalForceN;
  const kineticFrictionN = muK * normalForceN;
  const criticalAngleDeg = (Math.atan(muS) * 180) / Math.PI;
  const isAboveCritical = fgParallelN > maxStaticFrictionN + 1e-6;

  const v0 = params.inclineInitialVelocityMs; // + uphill, 0 rest
  const aUphillDecel = -g * (Math.sin(thetaRad) + muK * Math.cos(thetaRad)); // negative (downhill)
  const stopTimeUphillS = v0 > 0.01 ? v0 / Math.abs(aUphillDecel) : 0;

  let regime: InclineEval['regime'] = 'static_rest';
  let signedFrictionN = 0; // + uphill, - downhill
  let signedAccelMs2 = 0;
  let velocityMs = v0;
  let displacementM = 0;

  if (v0 > 0.01) {
    if (simTimeS < stopTimeUphillS) {
      // Moving uphill: kinetic friction points DOWNHILL (opposite motion!)
      regime = 'kinetic_uphill';
      signedFrictionN = -kineticFrictionN;
      signedAccelMs2 = aUphillDecel;
      velocityMs = v0 + aUphillDecel * simTimeS;
      displacementM = v0 * simTimeS + 0.5 * aUphillDecel * simTimeS * simTimeS;
    } else {
      const peakDisp = v0 * stopTimeUphillS + 0.5 * aUphillDecel * stopTimeUphillS * stopTimeUphillS;
      const dtAfter = simTimeS - stopTimeUphillS;
      if (!isAboveCritical) {
        // Locks in static friction at peak!
        regime = 'static_locked_peak';
        signedFrictionN = fgParallelN;
        signedAccelMs2 = 0;
        velocityMs = 0;
        displacementM = peakDisp;
      } else {
        // Reverses and slides downhill: kinetic friction flips UPHILL!
        const aDown = -g * (Math.sin(thetaRad) - muK * Math.cos(thetaRad));
        regime = 'kinetic_downhill';
        signedFrictionN = kineticFrictionN;
        signedAccelMs2 = aDown;
        velocityMs = aDown * dtAfter;
        displacementM = peakDisp + 0.5 * aDown * dtAfter * dtAfter;
      }
    }
  } else {
    // Released from rest
    if (!isAboveCritical) {
      regime = 'static_rest';
      signedFrictionN = fgParallelN; // uphill static friction balances mg sinθ
      signedAccelMs2 = 0;
      velocityMs = 0;
      displacementM = 0;
    } else {
      const aDown = -g * (Math.sin(thetaRad) - muK * Math.cos(thetaRad));
      regime = 'kinetic_downhill';
      signedFrictionN = kineticFrictionN; // uphill
      signedAccelMs2 = aDown;
      velocityMs = aDown * simTimeS;
      displacementM = 0.5 * aDown * simTimeS * simTimeS;
    }
  }

  return {
    weightN,
    fgParallelN,
    fgPerpN,
    normalForceN,
    maxStaticFrictionN,
    kineticFrictionN,
    criticalAngleDeg,
    isAboveCritical,
    regime,
    signedFrictionN,
    signedAccelMs2,
    velocityMs,
    displacementM,
    stopTimeUphillS,
  };
}

/**
 * Evaluate Mode 3: Stacked Two-Block System (2.7.A.1.i & 2.7.B.2)
 * Bottom sled m1 pulled right by F_pull; top block m2 rides on top with interface (μ_s, μ_k).
 */
export function evaluateStackedBlocks(
  params: Friction27Params,
  simTimeS: number
): StackedBlocksEval {
  const m1 = Math.max(1, params.bottomMassKg);
  const m2 = Math.max(0.5, params.topMassKg);
  const totalMassKg = m1 + m2;
  const g = params.gMs2;
  const muSTop = Math.max(0.05, params.topMuS);
  const muKTop = Math.max(0.02, Math.min(muSTop, params.topMuK));
  const muFloor = Math.max(0, params.floorMuK);
  const pullN = Math.max(0, params.stackPullForceN);

  const normalTopN = m2 * g;
  const normalFloorN = totalMassKg * g;
  const maxStaticTopN = muSTop * normalTopN;
  const kineticTopN = muKTop * normalTopN;
  const floorFrictionMaxN = muFloor * normalFloorN;

  // Slip threshold: a_together = (F_pull - μ_floor(m1+m2)g)/(m1+m2) <= μ_s,top * g
  const slipThresholdPullN = totalMassKg * g * (muSTop + muFloor);

  let regime: StackedBlocksEval['regime'] = 'stationary';
  let isSlipping = false;
  let floorFrictionN = 0;
  let frictionOnTopN = 0;
  let accelBottomMs2 = 0;
  let accelTopMs2 = 0;

  if (pullN <= floorFrictionMaxN + 1e-6) {
    regime = 'stationary';
    floorFrictionN = pullN;
    frictionOnTopN = 0;
    accelBottomMs2 = 0;
    accelTopMs2 = 0;
  } else if (pullN <= slipThresholdPullN + 1e-6) {
    // Static interface: top block accelerates FORWARD via static friction!
    regime = 'static_together';
    isSlipping = false;
    floorFrictionN = floorFrictionMaxN;
    const aSys = (pullN - floorFrictionN) / totalMassKg;
    accelBottomMs2 = aSys;
    accelTopMs2 = aSys;
    frictionOnTopN = m2 * aSys; // forward (+x)
  } else {
    // Kinetic slip at interface: top block slips backward relative to bottom sled,
    // so kinetic friction STILL pushes top block FORWARD (+μ_k,top m2 g)!
    regime = 'kinetic_slipping';
    isSlipping = true;
    floorFrictionN = floorFrictionMaxN;
    frictionOnTopN = kineticTopN; // forward (+x) on top block
    accelTopMs2 = frictionOnTopN / m2; // = μ_k,top * g
    accelBottomMs2 = Math.max(0, (pullN - kineticTopN - floorFrictionN) / m1);
  }

  const frictionOnBottomFromTopN = -frictionOnTopN; // Newton's 3rd law pair
  const relativeAccelTopVsBottomMs2 = accelTopMs2 - accelBottomMs2; // <= 0

  const bottomDisplacementM = 0.5 * accelBottomMs2 * simTimeS * simTimeS;
  const topDisplacementM = 0.5 * accelTopMs2 * simTimeS * simTimeS;
  const topRelativeOffsetM = topDisplacementM - bottomDisplacementM; // <= 0
  const velocityBottomMs = accelBottomMs2 * simTimeS;
  const velocityTopMs = accelTopMs2 * simTimeS;

  return {
    totalMassKg,
    normalTopN,
    normalFloorN,
    maxStaticTopN,
    kineticTopN,
    floorFrictionN,
    slipThresholdPullN,
    isSlipping,
    regime,
    frictionOnTopN,
    frictionOnBottomFromTopN,
    accelBottomMs2,
    accelTopMs2,
    relativeAccelTopVsBottomMs2,
    bottomDisplacementM,
    topDisplacementM,
    topRelativeOffsetM,
    velocityBottomMs,
    velocityTopMs,
  };
}

/**
 * Evaluate Mode 4: Area Independence (2.7.A.1.ii) vs. Material Dependence (2.7.A.2.i)
 */
export function evaluateAreaSurfaceCompare(
  params: Friction27Params,
  simTimeS: number
): AreaSurfaceCompareEval {
  const m = Math.max(0.5, params.compareMassKg);
  const g = params.gMs2;
  const pullN = Math.max(0, params.comparePullForceN);
  const matA = FRICTION_MATERIALS[params.materialId];
  const matB = FRICTION_MATERIALS[params.compareLaneBMaterialId];

  const evalLane = (
    label: string,
    mat: FrictionMaterialSpec,
    orientation: BlockOrientation
  ): CompareLaneEval => {
    const area = getContactAreaM2(orientation);
    const fn = m * g;
    const pressure = fn / area;
    const fsMax = mat.muS * fn;
    const fk = mat.muK * fn;
    if (pullN <= fsMax + 1e-6) {
      return {
        label,
        material: mat,
        orientation,
        contactAreaM2: area,
        normalForceN: fn,
        contactPressurePa: pressure,
        maxStaticFrictionN: fsMax,
        kineticFrictionN: fk,
        regime: 'static',
        actualFrictionN: pullN,
        accelMs2: 0,
        displacementM: 0,
        velocityMs: 0,
      };
    }
    const accel = (pullN - fk) / m;
    return {
      label,
      material: mat,
      orientation,
      contactAreaM2: area,
      normalForceN: fn,
      contactPressurePa: pressure,
      maxStaticFrictionN: fsMax,
      kineticFrictionN: fk,
      regime: 'kinetic',
      actualFrictionN: fk,
      accelMs2: accel,
      displacementM: 0.5 * accel * simTimeS * simTimeS,
      velocityMs: accel * simTimeS,
    };
  };

  const laneA = evalLane('Lane A · Wide Face (A)', matA, 'wide');
  const laneB = evalLane('Lane B · Narrow Edge (A/3)', matB, 'narrow');

  return {
    laneA,
    laneB,
    sameMaterial: matA.id === matB.id,
    pressureRatioBOverA: laneB.contactPressurePa / Math.max(1e-6, laneA.contactPressurePa),
    frictionDifferenceN: Math.abs(laneA.actualFrictionN - laneB.actualFrictionN),
  };
}

/**
 * Full unified evaluation for Topic 2.7 Workbench
 */
export function evaluateFriction27(
  params: Friction27Params,
  simTimeS: number,
  isPlaying = false
): Friction27Evaluation {
  const horizontal = evaluateHorizontalPull(params, simTimeS, isPlaying);
  const incline = evaluateInclineRamp(params, simTimeS);
  const stacked = evaluateStackedBlocks(params, simTimeS);
  const compare = evaluateAreaSurfaceCompare(params, simTimeS);

  let statusBanner = '';
  if (params.mode === 'horizontal_pull') {
    if (horizontal.regime === 'liftoff') {
      statusBanner = `2.7.A.2.ii: Upward pull exceeds weight (F_N = 0 N) — block lifts off track, so F_f = 0 N`;
    } else if (horizontal.regime === 'static' || horizontal.regime === 'breakaway') {
      statusBanner = `2.7.B.2 Static: F_f,s = ${horizontal.actualFrictionN.toFixed(1)} N ≤ μ_s F_N (${horizontal.maxStaticFrictionN.toFixed(1)} N) · Block at rest (a = 0)`;
    } else {
      statusBanner = `2.7.A.2 Kinetic Slip: F_f,k = μ_k F_N = ${horizontal.actualFrictionN.toFixed(1)} N · Net F_x = ${horizontal.netForceXN.toFixed(1)} N · a = ${horizontal.accelMs2.toFixed(2)} m/s²`;
    }
  } else if (params.mode === 'incline_ramp') {
    if (incline.regime === 'kinetic_uphill') {
      statusBanner = `2.7.A.1.i Uphill Slide: Kinetic friction points DOWNHILL (${incline.signedFrictionN.toFixed(1)} N) opposing velocity · a = ${incline.signedAccelMs2.toFixed(2)} m/s²`;
    } else if (incline.regime === 'static_rest' || incline.regime === 'static_locked_peak') {
      statusBanner = `2.7.B.2 Static Hold: θ = ${params.inclineAngleDeg.toFixed(0)}° ≤ θ_c (${incline.criticalAngleDeg.toFixed(1)}°) · F_f,s = mg sinθ = ${incline.signedFrictionN.toFixed(1)} N`;
    } else {
      statusBanner = `2.7.A.2 Downhill Slip: θ = ${params.inclineAngleDeg.toFixed(0)}° > θ_c (${incline.criticalAngleDeg.toFixed(1)}°) · F_f,k = +${incline.signedFrictionN.toFixed(1)} N uphill · a = ${incline.signedAccelMs2.toFixed(2)} m/s²`;
    }
  } else if (params.mode === 'stacked_blocks') {
    if (stacked.regime === 'stationary') {
      statusBanner = `2.7.B.1 At Rest: F_pull (${params.stackPullForceN.toFixed(0)} N) ≤ floor friction threshold`;
    } else if (stacked.regime === 'static_together') {
      statusBanner = `2.7.B.2 No Slip: Static friction pushes TOP block FORWARD (+${stacked.frictionOnTopN.toFixed(1)} N) · Shared a = ${stacked.accelTopMs2.toFixed(2)} m/s²`;
    } else {
      statusBanner = `2.7.A.1.i Slipping: Top lags sled, so F_f,k pushes TOP forward (+${stacked.frictionOnTopN.toFixed(1)} N, a_top=${stacked.accelTopMs2.toFixed(2)}) < a_sled (${stacked.accelBottomMs2.toFixed(2)} m/s²)`;
    }
  } else {
    statusBanner = compare.sameMaterial
      ? `2.7.A.1.ii Area Independence: Pressure is 3.0× higher on Narrow Edge, yet F_f (${compare.laneA.actualFrictionN.toFixed(1)} N) & a (${compare.laneA.accelMs2.toFixed(2)} m/s²) are IDENTICAL!`
      : `2.7.A.2.i Material Dependence: ${compare.laneA.material.shortName} (a=${compare.laneA.accelMs2.toFixed(2)}) vs ${compare.laneB.material.shortName} (a=${compare.laneB.accelMs2.toFixed(2)} m/s²)`;
  }

  return {
    simTimeS,
    horizontal,
    incline,
    stacked,
    compare,
    statusBanner,
  };
}

// ============================================================================
// SKILL 1.B — QUANTITATIVE GRAPHS WITH REAL SCALES, UNITS & DATA PLOTTING
// ============================================================================

export type QuantitativeGraphKind27 =
  | 'ff_vs_fapp'
  | 'ff_vs_fn_lab'
  | 'incline_vs_theta'
  | 'stack_accel_vs_fpull';

export interface GraphPoint27 {
  x: number; // real physical x value
  y: number; // real physical y value
}

export interface GraphSeries27 {
  label: string;
  color: string;
  dashed?: boolean;
  points: GraphPoint27[];
}

export interface GraphScatterPoint27 {
  x: number;
  y: number;
  color: string;
  label?: string;
}

export interface QuantitativeGraphSpec27 {
  kind: QuantitativeGraphKind27;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xUnit: string;
  yUnit: string;
  series: GraphSeries27[];
  scatterPoints?: GraphScatterPoint27[];
  referenceX?: number;
  referenceXLabel?: string;
  markerX: number;
  markerY: number;
  markerLabel: string;
  notes: string[];
}

export function buildQuantitativeGraph27(
  params: Friction27Params,
  ev: Friction27Evaluation,
  kind: QuantitativeGraphKind27,
  trials: LabTrialPoint[]
): QuantitativeGraphSpec27 {
  if (kind === 'ff_vs_fapp') {
    const h = ev.horizontal;
    const fsMax = Math.max(1, h.maxStaticFrictionN);
    const fk = Math.max(0.5, h.kineticFrictionN);
    const xMax = Math.max(60, Math.ceil((fsMax * 2.1) / 10) * 10);
    const yMax = Math.max(30, Math.ceil((fsMax * 1.35) / 10) * 10);

    const staticSeg: GraphPoint27[] = [
      { x: 0, y: 0 },
      { x: fsMax, y: fsMax },
    ];
    const breakDropSeg: GraphPoint27[] = [
      { x: fsMax, y: fsMax },
      { x: fsMax, y: fk },
    ];
    const kineticSeg: GraphPoint27[] = [
      { x: fsMax, y: fk },
      { x: xMax, y: fk },
    ];

    const markerX = Math.min(xMax, Math.max(0, h.fxAppliedN));
    const markerY = Math.min(yMax, Math.max(0, h.actualFrictionN));

    return {
      kind,
      title: 'Friction Force |F_f| vs. Horizontal Pull F_app,x',
      xAxisLabel: 'Horizontal Applied Force F_app,x (N)',
      yAxisLabel: 'Friction |F_f| (N)',
      xMin: 0,
      xMax,
      yMin: 0,
      yMax,
      xUnit: 'N',
      yUnit: 'N',
      series: [
        { label: 'Static (slope = 1)', color: '#10b981', points: staticSeg },
        { label: 'Breakaway Drop', color: '#f43f5e', dashed: true, points: breakDropSeg },
        { label: 'Kinetic Plateau', color: '#f59e0b', points: kineticSeg },
      ],
      referenceX: fsMax,
      referenceXLabel: `F_s,max=${fsMax.toFixed(1)}N`,
      markerX,
      markerY,
      markerLabel: `(${markerX.toFixed(1)}, ${markerY.toFixed(1)}) N`,
      notes: [
        `Static region (F_app,x ≤ ${fsMax.toFixed(1)} N): slope = 1 because |F_f,s| matches pull (2.7.B.2).`,
        `Breakaway drop (2.7.B.3): peak μ_s F_N = ${fsMax.toFixed(1)} N drops to kinetic plateau μ_k F_N = ${fk.toFixed(1)} N.`,
      ],
    };
  }

  if (kind === 'ff_vs_fn_lab') {
    const muS = params.muS;
    const muK = Math.min(muS, params.muK);
    const maxFnTrial = trials.reduce((acc, t) => Math.max(acc, t.normalForceN), 0);
    const curFn = ev.horizontal.normalForceN;
    const xMax = Math.max(80, Math.ceil((Math.max(maxFnTrial, curFn, 60) * 1.2) / 20) * 20);
    const yMax = Math.max(40, Math.ceil((xMax * Math.max(muS, 0.35) * 1.15) / 10) * 10);

    const staticLine: GraphPoint27[] = [
      { x: 0, y: 0 },
      { x: xMax, y: muS * xMax },
    ];
    const kineticLine: GraphPoint27[] = [
      { x: 0, y: 0 },
      { x: xMax, y: muK * xMax },
    ];

    const scatterPoints: GraphScatterPoint27[] = [];
    for (const t of trials) {
      scatterPoints.push({ x: t.normalForceN, y: t.maxStaticFrictionN, color: '#10b981' });
      scatterPoints.push({ x: t.normalForceN, y: t.kineticFrictionN, color: '#f59e0b' });
    }

    return {
      kind,
      title: 'Lab Data Plot: F_s,max & F_f,k vs. Normal Force F_N',
      xAxisLabel: 'Normal Force F_N (N)',
      yAxisLabel: 'Friction Force (N)',
      xMin: 0,
      xMax,
      yMin: 0,
      yMax,
      xUnit: 'N',
      yUnit: 'N',
      series: [
        { label: `F_s,max slope μ_s = ${muS.toFixed(2)}`, color: '#10b981', points: staticLine },
        { label: `F_f,k slope μ_k = ${muK.toFixed(2)}`, color: '#f59e0b', points: kineticLine },
      ],
      scatterPoints,
      markerX: curFn,
      markerY: ev.horizontal.maxStaticFrictionN,
      markerLabel: `F_N=${curFn.toFixed(0)}N`,
      notes: [
        `Linear slopes directly yield coefficients: slope(F_s,max/F_N) = μ_s = ${muS.toFixed(2)}, slope(F_f,k/F_N) = μ_k = ${muK.toFixed(2)} (Skill 1.B).`,
        `${trials.length} plotted lab trials — change mass or angle and click "Record Trial" to add points.`,
      ],
    };
  }

  if (kind === 'incline_vs_theta') {
    const inc = ev.incline;
    const m = params.inclineMassKg;
    const g = params.gMs2;
    const muS = params.muS;
    const muK = Math.min(muS, params.muK);
    const thetaC = inc.criticalAngleDeg;
    const yMax = Math.max(25, Math.ceil((m * g * 0.95) / 10) * 10);

    const staticCurve: GraphPoint27[] = [];
    const kineticCurve: GraphPoint27[] = [];
    const fgParCurve: GraphPoint27[] = [];

    for (let deg = 0; deg <= 60; deg += 1.5) {
      const rad = (deg * Math.PI) / 180;
      const fgP = m * g * Math.sin(rad);
      const fn = m * g * Math.cos(rad);
      fgParCurve.push({ x: deg, y: fgP });
      if (deg <= thetaC) {
        staticCurve.push({ x: deg, y: fgP });
      } else {
        kineticCurve.push({ x: deg, y: muK * fn });
      }
    }
    if (thetaC <= 60) {
      const cRad = (thetaC * Math.PI) / 180;
      staticCurve.push({ x: thetaC, y: m * g * Math.sin(cRad) });
      kineticCurve.unshift({ x: thetaC, y: muK * m * g * Math.cos(cRad) });
    }

    return {
      kind,
      title: 'Incline Friction |F_f| vs. Ramp Angle θ',
      xAxisLabel: 'Incline Angle θ (deg)',
      yAxisLabel: 'Force Along Ramp (N)',
      xMin: 0,
      xMax: 60,
      yMin: 0,
      yMax,
      xUnit: '°',
      yUnit: 'N',
      series: [
        { label: 'mg sinθ', color: '#38bdf8', dashed: true, points: fgParCurve },
        { label: 'Static F_f,s', color: '#10b981', points: staticCurve },
        { label: 'Kinetic F_f,k', color: '#f59e0b', points: kineticCurve },
      ],
      referenceX: Math.min(60, thetaC),
      referenceXLabel: `θ_c=${thetaC.toFixed(1)}°`,
      markerX: params.inclineAngleDeg,
      markerY: Math.abs(inc.signedFrictionN),
      markerLabel: `θ=${params.inclineAngleDeg.toFixed(0)}°`,
      notes: [
        `For θ ≤ θ_c = arctan(μ_s) = ${thetaC.toFixed(1)}°, static friction grows as mg sinθ to prevent slip.`,
        `For θ > θ_c, block slips and F_f,k = μ_k mg cosθ actually DECREASES as θ rises because F_N drops.`,
      ],
    };
  }

  // stack_accel_vs_fpull
  const st = ev.stacked;
  const xMax = Math.max(80, Math.ceil((st.slipThresholdPullN * 1.8) / 20) * 20);
  const aAtMax =
    (xMax - params.topMuK * params.topMassKg * params.gMs2 - params.floorMuK * st.totalMassKg * params.gMs2) /
    Math.max(1, params.bottomMassKg);
  const yMax = Math.max(8, Math.ceil(Math.max(aAtMax, params.topMuS * params.gMs2 * 1.4) / 2) * 2);

  const fFloor = params.floorMuK * st.totalMassKg * params.gMs2;
  const fSlip = st.slipThresholdPullN;
  const aSlip = params.topMuS * params.gMs2;
  const aTopKin = Math.min(params.topMuS, params.topMuK) * params.gMs2;
  const aBotRightAfterSlip = Math.max(0, (fSlip - st.kineticTopN - fFloor) / params.bottomMassKg);

  const botPts: GraphPoint27[] = [
    { x: 0, y: 0 },
    { x: Math.min(xMax, fFloor), y: 0 },
    { x: Math.min(xMax, fSlip), y: aSlip },
    { x: Math.min(xMax, fSlip), y: aBotRightAfterSlip },
    { x: xMax, y: Math.max(0, aAtMax) },
  ];
  const topPts: GraphPoint27[] = [
    { x: 0, y: 0 },
    { x: Math.min(xMax, fFloor), y: 0 },
    { x: Math.min(xMax, fSlip), y: aSlip },
    { x: Math.min(xMax, fSlip), y: aTopKin },
    { x: xMax, y: aTopKin },
  ];

  return {
    kind,
    title: 'Two-Block Stack: a_sled & a_top vs. F_pull',
    xAxisLabel: 'Pull Force on Bottom Sled F_pull (N)',
    yAxisLabel: 'Acceleration a (m/s²)',
    xMin: 0,
    xMax,
    yMin: 0,
    yMax,
    xUnit: 'N',
    yUnit: 'm/s²',
    series: [
      { label: 'Bottom Sled a₁', color: '#38bdf8', points: botPts },
      { label: 'Top Block a₂', color: '#10b981', points: topPts },
    ],
    referenceX: Math.min(xMax, fSlip),
    referenceXLabel: `F_slip=${fSlip.toFixed(0)}N`,
    markerX: Math.min(xMax, params.stackPullForceN),
    markerY: st.accelTopMs2,
    markerLabel: `a₂=${st.accelTopMs2.toFixed(1)}`,
    notes: [
      `Below F_slip = ${fSlip.toFixed(1)} N: static friction accelerates the top block forward at shared a = a₁ = a₂.`,
      `Above F_slip: top block slips backward relative to sled, dropping to constant a₂ = μ_k g = ${aTopKin.toFixed(2)} m/s².`,
    ],
  };
}

// ============================================================================
// SKILL 2.A — SYMBOLIC DERIVATION PATHWAYS
// ============================================================================

export interface DerivationStep27 {
  title: string;
  equation: string;
  explanation: string;
}

export interface DerivationPathway27 {
  id: string;
  ekCode: string;
  title: string;
  goal: string;
  steps: DerivationStep27[];
}

export const DERIVATION_PATHWAYS_27: DerivationPathway27[] = [
  {
    id: 'critical-angle',
    ekCode: '2.7.B.2.ii & 2.7.A.2.ii',
    title: 'Critical Slip Angle θ_c on an Incline',
    goal: 'Derive the maximum ramp angle θ_c at which a block remains at rest without slipping.',
    steps: [
      {
        title: 'Step 1 — Perpendicular Equilibrium (Normal Force)',
        equation: '∑F_⊥ = F_N - mg cosθ = 0  ⇒  F_N = mg cosθ',
        explanation: 'Normal force is perpendicular to and away from the ramp surface (2.7.A.2.ii).',
      },
      {
        title: 'Step 2 — Parallel Equilibrium at Verge of Slip',
        equation: '∑F_∥ = mg sinθ_c - F_s,max = 0  ⇒  mg sinθ_c = μ_s F_N',
        explanation: 'At the verge of slipping, static friction reaches its maximum μ_s F_N (2.7.B.2.ii).',
      },
      {
        title: 'Step 3 — Substitute F_N & Cancel mg',
        equation: 'mg sinθ_c = μ_s (mg cosθ_c)  ⇒  tanθ_c = μ_s  ⇒  θ_c = arctan(μ_s)',
        explanation: 'Mass m and gravity g cancel completely — θ_c depends ONLY on surface coefficient μ_s!',
      },
    ],
  },
  {
    id: 'angled-pull',
    ekCode: '2.7.A.2 & 2.7.B.2',
    title: 'Angled Pull Force & Normal-Force Reduction',
    goal: 'Derive the minimum angled pull F at angle φ above horizontal to start moving mass m.',
    steps: [
      {
        title: 'Step 1 — Vertical Force Balance',
        equation: 'F_N + F sinφ - mg = 0  ⇒  F_N = mg - F sinφ',
        explanation: 'Pulling upward reduces F_N (and therefore reduces friction μ_s F_N); pushing down increases F_N.',
      },
      {
        title: 'Step 2 — Horizontal Breakaway Condition',
        equation: 'F cosφ = μ_s F_N = μ_s (mg - F sinφ)',
        explanation: 'Horizontal component of pull must equal peak static friction to initiate sliding.',
      },
      {
        title: 'Step 3 — Solve Symbolically for F_min(φ)',
        equation: 'F_min(φ) = (μ_s m g) / (cosφ + μ_s sinφ)',
        explanation: 'Setting dF/dφ = 0 shows the optimal effortless pull angle is φ_opt = arctan(μ_s)!',
      },
    ],
  },
  {
    id: 'incline-kinetic',
    ekCode: '2.7.A.1.i & 2.7.A.2',
    title: 'Incline Acceleration: Uphill vs. Downhill',
    goal: 'Compare kinetic acceleration when sliding uphill (v > 0) vs. sliding downhill (v < 0).',
    steps: [
      {
        title: 'Step 1 — Kinetic Friction Magnitude',
        equation: '|F_f,k| = μ_k F_N = μ_k mg cosθ',
        explanation: 'Magnitude is identical in both directions, independent of speed or contact area (2.7.A.1.ii).',
      },
      {
        title: 'Step 2 — Moving Uphill (Friction Points Downhill)',
        equation: 'ma_up = -mg sinθ - μ_k mg cosθ  ⇒  a_up = -g (sinθ + μ_k cosθ)',
        explanation: 'Both gravity component and kinetic friction oppose the uphill velocity (2.7.A.1.i).',
      },
      {
        title: 'Step 3 — Moving Downhill (Friction Points Uphill)',
        equation: 'ma_down = -mg sinθ + μ_k mg cosθ  ⇒  a_down = -g (sinθ - μ_k cosθ)',
        explanation: 'Magnitude of deceleration uphill is always strictly greater than acceleration downhill.',
      },
    ],
  },
  {
    id: 'stacked-max-pull',
    ekCode: '2.7.B.1–2 & 2.7.A.1.i',
    title: 'Two-Block Stack Maximum No-Slip Pull',
    goal: 'Derive the maximum pull F_slip on lower block m₁ before upper block m₂ begins to slip.',
    steps: [
      {
        title: 'Step 1 — FBD on Upper Block m₂ Alone',
        equation: 'F_f,s (on 2) = m₂ a  ≤  μ_s,top m₂ g  ⇒  a_max = μ_s,top g',
        explanation: 'Static friction is the ONLY horizontal force accelerating m₂ forward without slipping!',
      },
      {
        title: 'Step 2 — System Equation (m₁ + m₂ Together)',
        equation: 'F_slip - μ_k,floor (m₁ + m₂)g = (m₁ + m₂) a_max',
        explanation: 'Internal friction pair between m₁ and m₂ cancels out of the combined two-block system.',
      },
      {
        title: 'Step 3 — Substitute a_max = μ_s,top g',
        equation: 'F_slip = (m₁ + m₂) g (μ_s,top + μ_k,floor)',
        explanation: 'Exceeding F_slip causes m₂ to lag behind m₁, switching interface friction to kinetic μ_k,top m₂ g.',
      },
    ],
  },
];

// ============================================================================
// SKILL 2.B — QUANTITATIVE COMPUTATION PATHWAY WITH UNITS
// ============================================================================

export interface QuantitativeSolution27 {
  title: string;
  givens: string[];
  steps: { label: string; calculation: string }[];
  finalAnswer: string;
}

export function solveFrictionCalculation27(
  params: Friction27Params,
  ev: Friction27Evaluation
): QuantitativeSolution27 {
  if (params.mode === 'horizontal_pull') {
    const h = ev.horizontal;
    return {
      title: 'Horizontal / Angled Pull Force & Acceleration (Skill 2.B)',
      givens: [
        `m = ${params.massKg.toFixed(1)} kg`,
        `F_app = ${h.effectiveAppliedForceN.toFixed(1)} N @ φ = ${params.pullAngleDeg}°`,
        `μ_s = ${params.muS.toFixed(2)}, μ_k = ${params.muK.toFixed(2)}`,
      ],
      steps: [
        {
          label: '1. Normal Force F_N',
          calculation: `F_N = mg - F sinφ = (${params.massKg.toFixed(1)})(${params.gMs2.toFixed(2)}) - (${h.effectiveAppliedForceN.toFixed(1)})sin(${params.pullAngleDeg}°) = ${h.normalForceN.toFixed(2)} N`,
        },
        {
          label: '2. Max Static Threshold F_s,max',
          calculation: `F_s,max = μ_s F_N = (${params.muS.toFixed(2)})(${h.normalForceN.toFixed(2)} N) = ${h.maxStaticFrictionN.toFixed(2)} N`,
        },
        {
          label: '3. Compare F_app,x vs. F_s,max',
          calculation: `F_app,x = ${h.fxAppliedN.toFixed(2)} N ${h.regime === 'kinetic' ? '>' : '≤'} ${h.maxStaticFrictionN.toFixed(2)} N ⇒ ${h.regime.toUpperCase()} regime`,
        },
        {
          label: '4. Friction & Acceleration',
          calculation:
            h.regime === 'kinetic'
              ? `F_f,k = μ_k F_N = ${h.kineticFrictionN.toFixed(2)} N; a = (${h.fxAppliedN.toFixed(2)} - ${h.kineticFrictionN.toFixed(2)}) / ${params.massKg.toFixed(1)} = ${h.accelMs2.toFixed(2)} m/s²`
              : `F_f,s = ${h.actualFrictionN.toFixed(2)} N (balances pull); a = 0.00 m/s²`,
        },
      ],
      finalAnswer: `F_f = ${h.actualFrictionN.toFixed(2)} N · a = ${h.accelMs2.toFixed(2)} m/s²`,
    };
  }

  if (params.mode === 'incline_ramp') {
    const inc = ev.incline;
    return {
      title: 'Incline Slip Threshold & Acceleration (Skill 2.B)',
      givens: [
        `m = ${params.inclineMassKg.toFixed(1)} kg`,
        `θ = ${params.inclineAngleDeg.toFixed(1)}°`,
        `μ_s = ${params.muS.toFixed(2)}, μ_k = ${params.muK.toFixed(2)}`,
      ],
      steps: [
        {
          label: '1. Critical Slip Angle θ_c',
          calculation: `θ_c = arctan(μ_s) = arctan(${params.muS.toFixed(2)}) = ${inc.criticalAngleDeg.toFixed(1)}°`,
        },
        {
          label: '2. Weight Components & Normal Force',
          calculation: `F_N = mg cosθ = ${inc.normalForceN.toFixed(2)} N; mg sinθ = ${inc.fgParallelN.toFixed(2)} N`,
        },
        {
          label: '3. Static Limit Check',
          calculation: `F_s,max = μ_s F_N = ${inc.maxStaticFrictionN.toFixed(2)} N vs mg sinθ = ${inc.fgParallelN.toFixed(2)} N`,
        },
        {
          label: '4. Resulting Friction & Acceleration',
          calculation: `F_f = ${inc.signedFrictionN >= 0 ? '+' : ''}${inc.signedFrictionN.toFixed(2)} N (uphill +); a = ${inc.signedAccelMs2.toFixed(2)} m/s²`,
        },
      ],
      finalAnswer: `θ_c = ${inc.criticalAngleDeg.toFixed(1)}° · a = ${inc.signedAccelMs2.toFixed(2)} m/s²`,
    };
  }

  if (params.mode === 'stacked_blocks') {
    const st = ev.stacked;
    return {
      title: 'Stacked Two-Block Slip Threshold (Skill 2.B)',
      givens: [
        `m₁ = ${params.bottomMassKg.toFixed(1)} kg, m₂ = ${params.topMassKg.toFixed(1)} kg`,
        `F_pull = ${params.stackPullForceN.toFixed(1)} N`,
        `μ_s,top = ${params.topMuS.toFixed(2)}, μ_k,top = ${params.topMuK.toFixed(2)}, μ_floor = ${params.floorMuK.toFixed(2)}`,
      ],
      steps: [
        {
          label: '1. Max No-Slip Acceleration of Top Block',
          calculation: `a_max = μ_s,top g = (${params.topMuS.toFixed(2)})(${params.gMs2.toFixed(2)}) = ${(params.topMuS * params.gMs2).toFixed(2)} m/s²`,
        },
        {
          label: '2. Critical Pull Force F_slip',
          calculation: `F_slip = (m₁ + m₂)g(μ_s,top + μ_floor) = (${st.totalMassKg.toFixed(1)})(${params.gMs2.toFixed(2)})(${(params.topMuS + params.floorMuK).toFixed(2)}) = ${st.slipThresholdPullN.toFixed(2)} N`,
        },
        {
          label: '3. Interface Friction on Top Block',
          calculation: `F_f,top = +${st.frictionOnTopN.toFixed(2)} N (${st.isSlipping ? 'kinetic slip' : 'static grip'})`,
        },
        {
          label: '4. Individual Accelerations',
          calculation: `a_sled = ${st.accelBottomMs2.toFixed(2)} m/s² · a_top = ${st.accelTopMs2.toFixed(2)} m/s²`,
        },
      ],
      finalAnswer: `F_slip = ${st.slipThresholdPullN.toFixed(1)} N · a_top = ${st.accelTopMs2.toFixed(2)} m/s²`,
    };
  }

  const cmp = ev.compare;
  return {
    title: 'Contact Pressure vs. Friction Calculation (Skill 2.B)',
    givens: [
      `m = ${params.compareMassKg.toFixed(1)} kg, F_pull = ${params.comparePullForceN.toFixed(1)} N`,
      `Area A = 0.06 m² vs Area B = 0.02 m² (3× smaller)`,
    ],
    steps: [
      {
        label: '1. Normal Force on Both Blocks',
        calculation: `F_N = mg = (${params.compareMassKg.toFixed(1)})(${params.gMs2.toFixed(2)}) = ${cmp.laneA.normalForceN.toFixed(2)} N`,
      },
      {
        label: '2. Contact Pressure P = F_N / A',
        calculation: `P_A = ${cmp.laneA.contactPressurePa.toFixed(0)} Pa · P_B = ${cmp.laneB.contactPressurePa.toFixed(0)} Pa (${cmp.pressureRatioBOverA.toFixed(1)}× higher)`,
      },
      {
        label: '3. Friction Force Comparison',
        calculation: `F_f,A = ${cmp.laneA.actualFrictionN.toFixed(2)} N (${cmp.laneA.material.shortName}) vs F_f,B = ${cmp.laneB.actualFrictionN.toFixed(2)} N (${cmp.laneB.material.shortName})`,
      },
      {
        label: '4. Resulting Acceleration',
        calculation: `a_A = ${cmp.laneA.accelMs2.toFixed(2)} m/s² · a_B = ${cmp.laneB.accelMs2.toFixed(2)} m/s²`,
      },
    ],
    finalAnswer: `ΔF_f = ${cmp.frictionDifferenceN.toFixed(2)} N · P_B/P_A = ${cmp.pressureRatioBOverA.toFixed(1)}×`,
  };
}

// ============================================================================
// SKILL 3.A — EXPERIMENTAL PROCEDURE DESIGNER
// ============================================================================

export interface ExperimentalProcedure27 {
  id: string;
  question: string;
  equipment: string[];
  steps: { text: string; isEssential: boolean; rationale: string }[];
  analysisMethod: string;
}

export const EXPERIMENTAL_PROCEDURES_27: ExperimentalProcedure27[] = [
  {
    id: 'measure-mu-s-k',
    question: 'Design a lab procedure to determine both μ_s and μ_k between a wood block and lab track.',
    equipment: ['Force sensor / spring scale', 'Wood block + slotted masses', 'Electronic balance', 'Level track'],
    steps: [
      {
        text: 'Measure total block mass m to compute normal force F_N = mg on a level track.',
        isEssential: true,
        rationale: 'Required to determine the independent variable F_N with low uncertainty.',
      },
      {
        text: 'Pull horizontally, increasing force slowly until slip begins; record peak F_s,max.',
        isEssential: true,
        rationale: 'Peak reading just before breakaway measures maximum static friction (2.7.B.2.ii).',
      },
      {
        text: 'Continue pulling at constant velocity (a = 0) and record steady force F_f,k.',
        isEssential: true,
        rationale: 'At constant velocity, ∑F_x = 0 so F_pull = F_f,k directly (2.7.A.2).',
      },
      {
        text: 'Repeat for 5+ added masses (varying F_N) and plot F_f vs. F_N to extract slopes μ_s and μ_k.',
        isEssential: true,
        rationale: 'Multiple trials & linear regression reduce random error (Skill 1.B & 3.A).',
      },
      {
        text: 'Tilt the pulling string 35° upward without recording the angle.',
        isEssential: false,
        rationale: 'Experimental flaw! An unmeasured vertical pull reduces F_N = mg - F sinφ and biases μ low.',
      },
    ],
    analysisMethod: 'Linear fit of F_s,max vs. F_N gives slope = μ_s; linear fit of F_f,k vs. F_N gives slope = μ_k.',
  },
  {
    id: 'test-area-independence',
    question: 'Design a controlled experiment to test whether kinetic friction depends on surface contact area.',
    equipment: ['Rectangular wood block (wide & narrow faces of same finish)', 'Force sensor', 'Level track'],
    steps: [
      {
        text: 'Use the SAME rectangular block (constant mass m, constant F_N = mg) with identical surface finish on both faces.',
        isEssential: true,
        rationale: 'Controls mass, normal force, and material properties (2.7.A.2.i) so only area varies.',
      },
      {
        text: 'Pull block horizontally at constant speed on its wide face (Area A) and record average F_f,k over 3 trials.',
        isEssential: true,
        rationale: 'Establishes baseline kinetic friction with repeated measurements.',
      },
      {
        text: 'Flip the SAME block onto its narrow edge (Area A/3) and repeat constant-speed pulls on the same track.',
        isEssential: true,
        rationale: 'Isolates contact area as the single independent variable (2.7.A.1.ii).',
      },
      {
        text: 'Stack a second 2 kg block on top only during the narrow-edge trials.',
        isEssential: false,
        rationale: 'Confounding variable! Changing mass changes F_N, invalidating the area test.',
      },
    ],
    analysisMethod: 'Compare mean F_f,k (wide) vs. mean F_f,k (narrow) within uncertainty bars; equality confirms 2.7.A.1.ii.',
  },
];

// ============================================================================
// SKILL 3.B — CONCEPTUAL AP CLAIMS (TRUE / FALSE)
// ============================================================================

export interface APClaim27 {
  id: string;
  ekCode: string;
  statement: string;
  verdict: 'true' | 'false';
  explanation: string;
}

export const AP_CLAIMS_27: APClaim27[] = [
  {
    id: 'c1-static-equality',
    ekCode: '2.7.B.2',
    statement:
      'A 4 kg block (μ_s = 0.50) sits at rest on a level table while pushed horizontally with 8 N. The static friction force on the block is μ_s F_N = 19.6 N.',
    verdict: 'false',
    explanation:
      'False! Static friction obeys |F_f,s| ≤ μ_s F_N (2.7.B.2). It only adopts the value required to prevent slipping — here F_f,s = 8 N, NOT 19.6 N.',
  },
  {
    id: 'c2-area-independence',
    ekCode: '2.7.A.1.ii',
    statement:
      'Flipping a uniform wooden brick from its wide face onto its narrow edge triples the contact pressure, but leaves kinetic friction F_f,k unchanged.',
    verdict: 'true',
    explanation:
      'True! By 2.7.A.1.ii, friction between two surfaces does not depend on contact area — it depends only on μ and F_N.',
  },
  {
    id: 'c3-mu-s-gt-mu-k',
    ekCode: '2.7.B.3',
    statement:
      'Once an applied horizontal force barely overcomes F_s,max and a block begins sliding, the friction force typically drops to a smaller kinetic value μ_k F_N.',
    verdict: 'true',
    explanation:
      'True! Because μ_s > μ_k for typical surface pairs (2.7.B.3), the block experiences a sudden net force jump at breakaway.',
  },
  {
    id: 'c4-angled-pull',
    ekCode: '2.7.A.2.ii',
    statement:
      'Pulling a sled with a rope angled 30° above the horizontal increases the normal force F_N compared to pulling horizontally.',
    verdict: 'false',
    explanation:
      'False! The upward component F sin30° supports part of the weight, so F_N = mg - F sin30° DECREASES, reducing friction.',
  },
  {
    id: 'c5-forward-friction',
    ekCode: '2.7.B.2 & 2.7.A.1.i',
    statement:
      'When a lower sled accelerates to the right and a top block rides along without slipping, static friction on the top block points to the RIGHT (in the direction of motion).',
    verdict: 'true',
    explanation:
      'True! Friction opposes RELATIVE motion between surfaces (2.7.B.2). Without forward static friction, the top block would slip backward relative to the sled.',
  },
  {
    id: 'c6-incline-uphill',
    ekCode: '2.7.A.1.i',
    statement:
      'A block launched uphill along a rough ramp experiences kinetic friction pointing uphill while it slows down.',
    verdict: 'false',
    explanation:
      'False! By 2.7.A.1.i, kinetic friction always opposes the velocity of the block relative to the ramp — so while moving uphill, kinetic friction points DOWNHILL.',
  },
];

export const INITIAL_LAB_TRIALS_27: LabTrialPoint[] = [
  {
    id: 'seed-1',
    massKg: 2.0,
    normalForceN: 2.0 * GRAVITY_G,
    maxStaticFrictionN: 0.5 * 2.0 * GRAVITY_G,
    kineticFrictionN: 0.3 * 2.0 * GRAVITY_G,
    materialId: 'wood_wood',
    orientation: 'wide',
  },
  {
    id: 'seed-2',
    massKg: 4.0,
    normalForceN: 4.0 * GRAVITY_G,
    maxStaticFrictionN: 0.5 * 4.0 * GRAVITY_G,
    kineticFrictionN: 0.3 * 4.0 * GRAVITY_G,
    materialId: 'wood_wood',
    orientation: 'wide',
  },
  {
    id: 'seed-3',
    massKg: 6.0,
    normalForceN: 6.0 * GRAVITY_G,
    maxStaticFrictionN: 0.5 * 6.0 * GRAVITY_G,
    kineticFrictionN: 0.3 * 6.0 * GRAVITY_G,
    materialId: 'wood_wood',
    orientation: 'narrow',
  },
];
