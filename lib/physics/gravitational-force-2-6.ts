/**
 * AP Physics C: Mechanics — Topic 2.6: Gravitational Force
 * Pure physics engine, shell-theorem solver, apparent-weight & equivalence-principle model,
 * qualitative graph generator (Skill 1.C), symbolic derivation pathways (Skill 2.A),
 * functional-dependence scaling predictor (Skill 2.D), and AP claim verifier (Skill 3.B).
 *
 * Strictly aligned with College Board AP Physics C: Mechanics Course Framework V.1 (Pages 49–52).
 */

export const G_UNIVERSAL = 6.6743e-11; // N·m²/kg²
export const EARTH_MASS_KG = 5.972e24;
export const EARTH_RADIUS_M = 6.371e6;
export const EARTH_G_EXACT = (G_UNIVERSAL * EARTH_MASS_KG) / (EARTH_RADIUS_M * EARTH_RADIUS_M); // ~9.819 m/s²
export const EARTH_G_AP = 9.8; // Standard AP C numerical value (and ≈10 N/kg per 2.6.B.2)

export type Gravity26Mode =
  | 'universal_field'
  | 'near_surface'
  | 'apparent_weight'
  | 'shell_theorem';

export type AstroBodyPreset = 'earth' | 'moon' | 'mars' | 'jupiter';

export type ElevatorPreset =
  | 'rest'
  | 'accel_up'
  | 'accel_down'
  | 'free_fall'
  | 'equivalence';

export type ShellGeometryKind = 'solid_sphere' | 'hollow_shell';

export interface AstroBodySpec {
  id: AstroBodyPreset;
  name: string;
  massKg: number;
  massIn1e24: number;
  radiusM: number;
  radiusKm: number;
  surfaceG: number;
  colorHex: number;
  accentHex: number;
  atmosphereHex: number;
}

export const ASTRO_BODIES: Record<AstroBodyPreset, AstroBodySpec> = {
  earth: {
    id: 'earth',
    name: 'Earth',
    massKg: 5.972e24,
    massIn1e24: 5.97,
    radiusM: 6.371e6,
    radiusKm: 6371,
    surfaceG: (G_UNIVERSAL * 5.972e24) / (6.371e6 * 6.371e6),
    colorHex: 0x1d6fa5,
    accentHex: 0x10b981,
    atmosphereHex: 0x38bdf8,
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    massKg: 7.342e22,
    massIn1e24: 0.0734,
    radiusM: 1.737e6,
    radiusKm: 1737,
    surfaceG: (G_UNIVERSAL * 7.342e22) / (1.737e6 * 1.737e6),
    colorHex: 0x94a3b8,
    accentHex: 0xcbd5e1,
    atmosphereHex: 0x64748b,
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    massKg: 6.417e23,
    massIn1e24: 0.642,
    radiusM: 3.39e6,
    radiusKm: 3390,
    surfaceG: (G_UNIVERSAL * 6.417e23) / (3.39e6 * 3.39e6),
    colorHex: 0xc25934,
    accentHex: 0xf59e0b,
    atmosphereHex: 0xfb923c,
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    massKg: 1.898e27,
    massIn1e24: 1898,
    radiusM: 6.991e7,
    radiusKm: 69910,
    surfaceG: (G_UNIVERSAL * 1.898e27) / (6.991e7 * 6.991e7),
    colorHex: 0xd99b52,
    accentHex: 0xfbbf24,
    atmosphereHex: 0xfde68a,
  },
};

export interface Gravity26Params {
  mode: Gravity26Mode;
  // Mode 1: Universal Gravitation & Field (2.6.A)
  primaryMassFactor: number; // Multiplier of Earth mass (0.2 to 4.0)
  testMassKg: number; // Test object mass m (1 to 100 kg)
  separationInR: number; // Center-to-center distance r in units of R_E (1.0 to 4.0)
  showFieldVectors: boolean;
  showForcePair: boolean;
  showComLine: boolean;
  // Mode 2: Near-Surface Constant g & Inertial/Gravitational Mass Equivalence (2.6.B & 2.6.D)
  bodyPreset: AstroBodyPreset;
  altitudeKm: number; // Altitude h above surface (0 to 6371 km)
  dropMassHeavyKg: number; // Heavy mass m_1 (2 to 20 kg)
  dropMassLightKg: number; // Light mass m_2 (0.5 to 5 kg)
  hypotheticalMgOverMi: number; // Real world = 1.00; optional thought-experiment ratio (0.5 to 1.5)
  // Mode 3: Apparent Weight & Equivalence Principle (2.6.C)
  elevatorPreset: ElevatorPreset;
  riderMassKg: number; // Rider mass (20 to 120 kg)
  planetG: number; // Local gravitational field strength (1.6 to 15.0 N/kg)
  cabinAccelMs2: number; // Upward cabin acceleration a_y (-12 to +12 m/s²)
  equivalenceSplit: boolean; // Show side-by-side Stationary Planet vs Accelerating Deep-Space Rocket
  // Mode 4: Newton's Shell Theorem (2.6.E)
  shellKind: ShellGeometryKind;
  shellMassFactor: number; // Total spherical mass M in Earth masses (0.5 to 3.0)
  shellRadiusFactor: number; // Radius R in units of R_E (0.6 to 1.5)
  probeRadiusRatio: number; // r / R from 0.0 to 2.5
  probeMassKg: number; // Test mass m (1 to 50 kg)
  showDifferentialPatches: boolean; // Visualize opposing solid-angle patches dm1, dm2 inside shell
  // Shared animation time (seconds)
  simTimeS: number;
}

export function createDefaultGravity26Params(mode: Gravity26Mode = 'universal_field'): Gravity26Params {
  return {
    mode,
    primaryMassFactor: 1.0,
    testMassKg: 10,
    separationInR: 2.0,
    showFieldVectors: true,
    showForcePair: true,
    showComLine: true,
    bodyPreset: 'earth',
    altitudeKm: 10,
    dropMassHeavyKg: 10,
    dropMassLightKg: 1,
    hypotheticalMgOverMi: 1.0,
    elevatorPreset: 'accel_up',
    riderMassKg: 60,
    planetG: 9.8,
    cabinAccelMs2: 3.0,
    equivalenceSplit: false,
    shellKind: 'solid_sphere',
    shellMassFactor: 1.0,
    shellRadiusFactor: 1.0,
    probeRadiusRatio: 0.6,
    probeMassKg: 10,
    showDifferentialPatches: true,
    simTimeS: 0,
  };
}

export function applyElevatorPreset(
  prev: Gravity26Params,
  preset: ElevatorPreset
): Gravity26Params {
  if (preset === 'rest') {
    return { ...prev, elevatorPreset: preset, cabinAccelMs2: 0, equivalenceSplit: false, simTimeS: 0 };
  }
  if (preset === 'accel_up') {
    return { ...prev, elevatorPreset: preset, cabinAccelMs2: 3.5, equivalenceSplit: false, simTimeS: 0 };
  }
  if (preset === 'accel_down') {
    return { ...prev, elevatorPreset: preset, cabinAccelMs2: -3.5, equivalenceSplit: false, simTimeS: 0 };
  }
  if (preset === 'free_fall') {
    return {
      ...prev,
      elevatorPreset: preset,
      cabinAccelMs2: -Number(prev.planetG.toFixed(2)),
      equivalenceSplit: false,
      simTimeS: 0,
    };
  }
  // equivalence
  return {
    ...prev,
    elevatorPreset: 'equivalence',
    cabinAccelMs2: 0,
    equivalenceSplit: true,
    simTimeS: 0,
  };
}

export interface UniversalFieldResult {
  primaryMassKg: number;
  testMassKg: number;
  separationM: number;
  fieldStrengthNPerKg: number;
  gravitationalForceN: number;
  observedAccelMs2: number;
  ratioToSurfaceG: number;
  animatedSeparationInR: number;
}

export interface NearSurfaceResult {
  body: AstroBodySpec;
  altitudeM: number;
  radiusFromCenterM: number;
  gSurface: number;
  gAtAltitude: number;
  percentChange: number;
  constantGValid: boolean;
  heavyFgN: number;
  lightFgN: number;
  heavyAccelMs2: number;
  lightAccelMs2: number;
  heavyDropDistM: number;
  lightDropDistM: number;
  dropHeightM: number;
}

export interface ApparentWeightResult {
  riderMassKg: number;
  trueWeightFgN: number;
  apparentWeightFnN: number;
  netForceN: number;
  effectiveAccelMs2: number;
  isWeightless: boolean;
  apparentRatio: number;
  regimeLabel: string;
  cabinOffsetM: number;
  equivalenceRocketFnN: number;
  equivalenceBallDropM: number;
}

export interface ShellTheoremResult {
  shellKind: ShellGeometryKind;
  totalMassKg: number;
  radiusM: number;
  densityKgPerM3: number;
  rOverR: number;
  currentRadiusM: number;
  isInside: boolean;
  partialMassKg: number;
  partialMassFraction: number;
  effectiveK_NPerM: number;
  fieldStrengthNPerKg: number;
  surfaceFieldG: number;
  gravitationalForceN: number;
  signedRadialForceN: number; // Negative = inward toward center
  animatedROverR: number;
  animatedSignedForceN: number;
  shmAngularFreqRadS: number;
  shmPeriodMin: number;
}

export interface Gravity26Evaluation {
  mode: Gravity26Mode;
  universal: UniversalFieldResult;
  nearSurface: NearSurfaceResult;
  apparent: ApparentWeightResult;
  shell: ShellTheoremResult;
  legendBanner: string;
}

/**
 * Pure Universal Gravitation evaluator (2.6.A.1, 2.6.A.2, 2.6.A.3)
 */
export function evaluateUniversalField(params: Gravity26Params): UniversalFieldResult {
  const M = Math.max(0.05, params.primaryMassFactor) * EARTH_MASS_KG;
  const m = Math.max(0.1, params.testMassKg);
  const baseR = Math.max(1.0, params.separationInR);
  // Smooth radial free-fall visualization during playback without hitting the surface
  const r0 = baseR;
  const t = Math.max(0, params.simTimeS);
  const g0Visual = (G_UNIVERSAL * M) / Math.pow(r0 * EARTH_RADIUS_M, 2);
  // Scaled visual radial descent over a 3.0s playback cycle
  const visualFracDrop = Math.min(r0 - 1.06, 0.11 * (g0Visual / EARTH_G_EXACT) * t * t);
  const animatedSeparationInR = Math.max(1.06, r0 - visualFracDrop);

  const separationM = animatedSeparationInR * EARTH_RADIUS_M;
  const fieldStrengthNPerKg = (G_UNIVERSAL * M) / (separationM * separationM);
  const gravitationalForceN = fieldStrengthNPerKg * m;
  // 2.6.A.2.ii: If gravity is the only force, |a| (m/s²) === |g| (N/kg)
  const observedAccelMs2 = gravitationalForceN / m;
  const surfaceG = (G_UNIVERSAL * M) / (EARTH_RADIUS_M * EARTH_RADIUS_M);
  const ratioToSurfaceG = surfaceG > 0 ? fieldStrengthNPerKg / surfaceG : 0;

  return {
    primaryMassKg: M,
    testMassKg: m,
    separationM,
    fieldStrengthNPerKg,
    gravitationalForceN,
    observedAccelMs2,
    ratioToSurfaceG,
    animatedSeparationInR,
  };
}

/**
 * Pure Near-Surface Constant g & Mass Equivalence evaluator (2.6.B & 2.6.D)
 */
export function evaluateNearSurface(params: Gravity26Params): NearSurfaceResult {
  const body = ASTRO_BODIES[params.bodyPreset] || ASTRO_BODIES.earth;
  const altitudeM = Math.max(0, params.altitudeKm) * 1000;
  const radiusFromCenterM = body.radiusM + altitudeM;
  const gSurface = (G_UNIVERSAL * body.massKg) / (body.radiusM * body.radiusM);
  const gAtAltitude = (G_UNIVERSAL * body.massKg) / (radiusFromCenterM * radiusFromCenterM);
  const percentChange = gSurface > 0 ? ((gAtAltitude - gSurface) / gSurface) * 100 : 0;
  // Constant g approximation holds cleanly when |Δg/g| < 1% (2.6.B.1)
  const constantGValid = Math.abs(percentChange) < 1.0;

  // 2.6.D: F_g = m_g * g, a = F_g / m_i = (m_g / m_i) * g
  // In physical reality m_g / m_i = 1.00 for all materials (2.6.D.3)
  const heavyMg = Math.max(0.5, params.dropMassHeavyKg);
  const lightMg = Math.max(0.2, params.dropMassLightKg);
  const ratio = Math.max(0.4, Math.min(1.6, params.hypotheticalMgOverMi));

  const heavyFgN = heavyMg * ratio * gAtAltitude;
  const lightFgN = lightMg * gAtAltitude;
  const heavyAccelMs2 = heavyFgN / heavyMg; // = ratio * gAtAltitude
  const lightAccelMs2 = lightFgN / lightMg; // = gAtAltitude

  const dropHeightM = 20.0;
  const t = Math.max(0, params.simTimeS);
  const heavyDropDistM = Math.min(dropHeightM, 0.5 * heavyAccelMs2 * t * t);
  const lightDropDistM = Math.min(dropHeightM, 0.5 * lightAccelMs2 * t * t);

  return {
    body,
    altitudeM,
    radiusFromCenterM,
    gSurface,
    gAtAltitude,
    percentChange,
    constantGValid,
    heavyFgN,
    lightFgN,
    heavyAccelMs2,
    lightAccelMs2,
    heavyDropDistM,
    lightDropDistM,
    dropHeightM,
  };
}

/**
 * Pure Apparent Weight & Equivalence Principle evaluator (2.6.C.1–2.6.C.4)
 */
export function evaluateApparentWeight(params: Gravity26Params): ApparentWeightResult {
  const m = Math.max(1, params.riderMassKg);
  const g = Math.max(0.1, params.planetG);
  const aRequested = params.equivalenceSplit ? 0 : params.cabinAccelMs2;

  // Floor normal force cannot pull downward on an unstrapped rider: F_N = max(0, m(g + a_y))
  const rawFn = m * (g + aRequested);
  const apparentWeightFnN = Math.max(0, rawFn);
  const trueWeightFgN = m * g;
  const effectiveAccelMs2 = (apparentWeightFnN - trueWeightFgN) / m;
  const netForceN = apparentWeightFnN - trueWeightFgN;
  const isWeightless = apparentWeightFnN < 1e-4;
  const apparentRatio = trueWeightFgN > 0 ? apparentWeightFnN / trueWeightFgN : 0;

  let regimeLabel = 'Equilibrium (F_N = F_g)';
  if (params.equivalenceSplit) {
    regimeLabel = 'Equivalence Principle: Stationary Planet g ≡ Deep-Space Rocket a = g';
  } else if (isWeightless) {
    regimeLabel = 'Free-Fall Weightlessness (F_N = 0, yet F_g = mg ≠ 0)';
  } else if (effectiveAccelMs2 > 0.05) {
    regimeLabel = 'Upward Acceleration (Apparent Weight F_N > F_g)';
  } else if (effectiveAccelMs2 < -0.05) {
    regimeLabel = 'Downward Acceleration (Apparent Weight F_N < F_g)';
  }

  // Visual cabin vertical displacement over playback cycle
  const t = Math.max(0, params.simTimeS);
  const clampedDisp = Math.max(-2.2, Math.min(2.2, 0.22 * effectiveAccelMs2 * t * t));
  const cabinOffsetM = params.equivalenceSplit ? 0 : clampedDisp;

  // Equivalence principle comparison: Deep-space rocket accelerating upward at a = g
  const equivalenceRocketFnN = m * g;
  const equivalenceBallDropM = Math.min(1.6, 0.5 * g * Math.pow(Math.min(t, 1.2), 2) * 0.35);

  return {
    riderMassKg: m,
    trueWeightFgN,
    apparentWeightFnN,
    netForceN,
    effectiveAccelMs2,
    isWeightless,
    apparentRatio,
    regimeLabel,
    cabinOffsetM,
    equivalenceRocketFnN,
    equivalenceBallDropM,
  };
}

/**
 * Pure Newton's Shell Theorem & Uniform Sphere evaluator (2.6.E.1–2.6.E.3)
 */
export function evaluateShellTheorem(params: Gravity26Params): ShellTheoremResult {
  const M = Math.max(0.1, params.shellMassFactor) * EARTH_MASS_KG;
  const R = Math.max(0.3, params.shellRadiusFactor) * EARTH_RADIUS_M;
  const m = Math.max(0.5, params.probeMassKg);
  const volume = (4 / 3) * Math.PI * R * R * R;
  const densityKgPerM3 = M / volume;
  const surfaceFieldG = (G_UNIVERSAL * M) / (R * R);

  // Restoring spring-like constant inside uniform solid sphere: k = G M m / R³ = (4/3)π G ρ m
  const effectiveK_NPerM = (G_UNIVERSAL * M * m) / (R * R * R);
  const shmAngularFreqRadS = Math.sqrt((G_UNIVERSAL * M) / (R * R * R));
  const shmPeriodMin = (2 * Math.PI) / shmAngularFreqRadS / 60;

  const rOverR = Math.max(0, Math.min(2.5, params.probeRadiusRatio));
  const currentRadiusM = rOverR * R;

  // Animated probe position during playback
  let animatedROverR = rOverR;
  if (params.simTimeS > 0) {
    if (params.shellKind === 'solid_sphere' && rOverR <= 1.0 && rOverR > 0.02) {
      // Exact SHM gravity tunnel oscillation: r(t) = r_0 cos(ω_vis t), signed coordinate in [-r0, r0]
      const omegaVis = 1.65;
      animatedROverR = rOverR * Math.cos(omegaVis * params.simTimeS);
    } else if (params.shellKind === 'hollow_shell' && rOverR < 0.98) {
      // Zero net force inside hollow shell -> constant-velocity drift between ±0.72R
      const phase = (params.simTimeS * 0.45) % 2;
      const tri = phase < 1 ? phase : 2 - phase;
      animatedROverR = (tri * 2 - 1) * Math.min(0.74, Math.max(0.35, rOverR));
    } else {
      // Outside r > R: gentle inward pull toward surface R
      const drop = Math.min(rOverR - 1.04, 0.14 * params.simTimeS * params.simTimeS);
      animatedROverR = Math.max(1.04, rOverR - drop);
    }
  }

  const evalAtRatio = (signedRatio: number) => {
    const absRatio = Math.abs(signedRatio);
    const rMeters = absRatio * R;
    const inside = absRatio < 1.0 - 1e-9;

    if (params.shellKind === 'hollow_shell') {
      if (inside) {
        return {
          isInside: true,
          partialMassKg: 0,
          partialMassFraction: 0,
          gMag: 0,
          fMag: 0,
          signedF: 0,
        };
      }
      const gMag = (G_UNIVERSAL * M) / (rMeters * rMeters);
      const fMag = gMag * m;
      const sign = signedRatio >= 0 ? -1 : 1;
      return {
        isInside: false,
        partialMassKg: M,
        partialMassFraction: 1,
        gMag,
        fMag,
        signedF: sign * fMag,
      };
    }

    // Uniform solid sphere
    if (inside) {
      const partialMassKg = densityKgPerM3 * (4 / 3) * Math.PI * rMeters * rMeters * rMeters;
      const partialMassFraction = absRatio * absRatio * absRatio;
      // 2.6.E.3: F_{g,partial} = -k r_{partial}
      const fMag = effectiveK_NPerM * rMeters;
      const gMag = fMag / m;
      const signedF = -effectiveK_NPerM * (signedRatio * R);
      return {
        isInside: true,
        partialMassKg,
        partialMassFraction,
        gMag,
        fMag,
        signedF,
      };
    }

    const gMag = (G_UNIVERSAL * M) / (rMeters * rMeters);
    const fMag = gMag * m;
    const sign = signedRatio >= 0 ? -1 : 1;
    return {
      isInside: false,
      partialMassKg: M,
      partialMassFraction: 1,
      gMag,
      fMag,
      signedF: sign * fMag,
    };
  };

  const staticEval = evalAtRatio(rOverR);
  const animEval = evalAtRatio(animatedROverR);

  return {
    shellKind: params.shellKind,
    totalMassKg: M,
    radiusM: R,
    densityKgPerM3,
    rOverR,
    currentRadiusM,
    isInside: staticEval.isInside,
    partialMassKg: staticEval.partialMassKg,
    partialMassFraction: staticEval.partialMassFraction,
    effectiveK_NPerM,
    fieldStrengthNPerKg: staticEval.gMag,
    surfaceFieldG,
    gravitationalForceN: staticEval.fMag,
    signedRadialForceN: staticEval.signedF,
    animatedROverR,
    animatedSignedForceN: animEval.signedF,
    shmAngularFreqRadS,
    shmPeriodMin,
  };
}

/**
 * Unified evaluator for all 4 Topic 2.6 lab modes
 */
export function evaluateGravity26(params: Gravity26Params): Gravity26Evaluation {
  const universal = evaluateUniversalField(params);
  const nearSurface = evaluateNearSurface(params);
  const apparent = evaluateApparentWeight(params);
  const shell = evaluateShellTheorem(params);

  let legendBanner = '';
  if (params.mode === 'universal_field') {
    legendBanner = `2.6.A: |g| = GM/r² = ${universal.fieldStrengthNPerKg.toFixed(2)} N/kg · |F_g| = ${universal.gravitationalForceN.toFixed(1)} N · Free-fall a = ${universal.observedAccelMs2.toFixed(2)} m/s² (independent of m)`;
  } else if (params.mode === 'near_surface') {
    legendBanner = `2.6.B & 2.6.D: At h = ${params.altitudeKm.toFixed(0)} km above ${nearSurface.body.name}, g = ${nearSurface.gAtAltitude.toFixed(2)} N/kg (${nearSurface.percentChange.toFixed(2)}%) · ${nearSurface.constantGValid ? 'Constant-g valid' : '1/r² variation significant'}`;
  } else if (params.mode === 'apparent_weight') {
    legendBanner = `2.6.C: ${apparent.regimeLabel} · F_N = ${apparent.apparentWeightFnN.toFixed(1)} N vs F_g = ${apparent.trueWeightFgN.toFixed(1)} N`;
  } else {
    legendBanner =
      params.shellKind === 'hollow_shell'
        ? shell.isInside
          ? `2.6.E.2.i: Inside thin hollow shell (r = ${shell.rOverR.toFixed(2)}R < R) → F_net = 0 N everywhere`
          : `2.6.E.2.ii: Outside thin hollow shell (r = ${shell.rOverR.toFixed(2)}R) → acts as point mass M at center · F_g = ${shell.gravitationalForceN.toFixed(1)} N`
        : shell.isInside
        ? `2.6.E.3: Inside uniform sphere (r = ${shell.rOverR.toFixed(2)}R) → m_partial = ${(shell.partialMassFraction * 100).toFixed(1)}% M · F_g = -kr = ${shell.signedRadialForceN.toFixed(1)} N`
        : `2.6.E.2: Outside uniform sphere (r = ${shell.rOverR.toFixed(2)}R) → full mass M acts at center · F_g = ${shell.gravitationalForceN.toFixed(1)} N`;
  }

  return {
    mode: params.mode,
    universal,
    nearSurface,
    apparent,
    shell,
    legendBanner,
  };
}

// ============================================================================
// SKILL 1.C — QUALITATIVE GRAPH GENERATOR
// ============================================================================
export type QualitativeGraphKind = 'solid_g_vs_r' | 'hollow_g_vs_r' | 'altitude_g_vs_h' | 'apparent_fn_vs_a';

export interface QualitativeGraphPoint {
  x: number; // Normalized [0, 1]
  y: number; // Normalized [0, 1]
}

export interface QualitativeGraphSpec {
  kind: QualitativeGraphKind;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  xMarkerPos: number; // Normalized [0, 1]
  yMarkerPos: number; // Normalized [0, 1]
  markerLabel: string;
  referenceXPos?: number; // e.g., r = R boundary line
  referenceXLabel?: string;
  segments: QualitativeGraphPoint[][]; // Multiple segments allow discontinuity at r=R for hollow shell
  featureCallouts: string[];
}

export function buildQualitativeGraph26(
  params: Gravity26Params,
  evaluation: Gravity26Evaluation,
  kind: QualitativeGraphKind
): QualitativeGraphSpec {
  const rMaxRatio = 2.5;

  if (kind === 'solid_g_vs_r') {
    const insideSeg: QualitativeGraphPoint[] = [];
    const outsideSeg: QualitativeGraphPoint[] = [];
    for (let i = 0; i <= 24; i++) {
      const r = (i / 24) * 1.0;
      insideSeg.push({ x: r / rMaxRatio, y: r }); // Linear from 0 to 1 at r=R
    }
    for (let i = 0; i <= 36; i++) {
      const r = 1.0 + (i / 36) * (rMaxRatio - 1.0);
      outsideSeg.push({ x: r / rMaxRatio, y: 1 / (r * r) });
    }
    const rCur = Math.min(
      rMaxRatio,
      Math.max(
        0,
        params.mode === 'universal_field'
          ? evaluation.universal.animatedSeparationInR
          : Math.abs(evaluation.shell.animatedROverR)
      )
    );
    const yCur = rCur <= 1.0 ? rCur : 1 / (rCur * rCur);
    return {
      kind,
      title: 'Uniform Solid Sphere: |g(r)| vs. r',
      xAxisLabel: 'Distance from Center (r / R)',
      yAxisLabel: '|g| / g_surface',
      xMarkerPos: rCur / rMaxRatio,
      yMarkerPos: yCur,
      markerLabel: `r=${rCur.toFixed(2)}R`,
      referenceXPos: 1.0 / rMaxRatio,
      referenceXLabel: 'r = R',
      segments: [insideSeg, outsideSeg],
      featureCallouts: [
        'r < R: Linear increase |g| ∝ r because m_partial ∝ r³ while 1/r² gives r³/r² = r.',
        'r = R: Peak gravitational field strength g_surface = GM/R² (continuous peak).',
        'r > R: Inverse-square decay |g| ∝ 1/r² asymptotically approaching zero.',
      ],
    };
  }

  if (kind === 'hollow_g_vs_r') {
    const insideSeg: QualitativeGraphPoint[] = [
      { x: 0, y: 0 },
      { x: 1.0 / rMaxRatio, y: 0 },
    ];
    const outsideSeg: QualitativeGraphPoint[] = [];
    for (let i = 0; i <= 36; i++) {
      const r = 1.0 + (i / 36) * (rMaxRatio - 1.0);
      outsideSeg.push({ x: r / rMaxRatio, y: 1 / (r * r) });
    }
    const rCur = Math.min(
      rMaxRatio,
      Math.max(
        0,
        params.mode === 'universal_field'
          ? evaluation.universal.animatedSeparationInR
          : Math.abs(evaluation.shell.animatedROverR)
      )
    );
    const yCur = rCur < 1.0 ? 0 : 1 / (rCur * rCur);
    return {
      kind,
      title: 'Thin Hollow Shell: |g(r)| vs. r',
      xAxisLabel: 'Distance from Center (r / R)',
      yAxisLabel: '|g| / g_surface',
      xMarkerPos: rCur / rMaxRatio,
      yMarkerPos: yCur,
      markerLabel: `r=${rCur.toFixed(2)}R`,
      referenceXPos: 1.0 / rMaxRatio,
      referenceXLabel: 'r = R',
      segments: [insideSeg, outsideSeg],
      featureCallouts: [
        'r < R: Identically zero everywhere inside the hollow cavity (Newton’s shell theorem 2.6.E.2.i).',
        'r = R: Discontinuous jump from 0 to GM/R² across the thin mass shell.',
        'r > R: Identical to a point mass M concentrated at r = 0 (1/r² decay).',
      ],
    };
  }

  if (kind === 'altitude_g_vs_h') {
    const body = evaluation.nearSurface.body;
    const maxH = body.radiusKm; // up to h = R
    const curve: QualitativeGraphPoint[] = [];
    for (let i = 0; i <= 40; i++) {
      const hFrac = i / 40; // h / R from 0 to 1
      const gRatio = 1 / Math.pow(1 + hFrac, 2);
      curve.push({ x: hFrac, y: gRatio });
    }
    const hCurFrac = Math.min(1, Math.max(0, params.altitudeKm / maxH));
    const gCurRatio = 1 / Math.pow(1 + hCurFrac, 2);
    return {
      kind,
      title: 'Near-Surface Constant g vs. Altitude h',
      xAxisLabel: 'Altitude h / R_planet',
      yAxisLabel: 'g(h) / g_0',
      xMarkerPos: hCurFrac,
      yMarkerPos: gCurRatio,
      markerLabel: `h=${params.altitudeKm.toFixed(0)}km`,
      referenceXPos: 0.05,
      referenceXLabel: 'h ≪ R',
      segments: [curve],
      featureCallouts: [
        'h ≪ R: Curve stays nearly flat near g/g_0 ≈ 1 (constant-force model F_g = mg valid, 2.6.B.1).',
        'h = R (r = 2R): Field strength falls to exactly 1/4 of surface gravity (g_0/4).',
      ],
    };
  }

  // apparent_fn_vs_a
  const g = Math.max(0.1, params.planetG);
  const aMin = -1.5 * g;
  const aMax = 1.5 * g;
  const fnMax = 2.5; // in units of mg
  const toX = (a: number) => (a - aMin) / (aMax - aMin);
  const toY = (fnRatio: number) => Math.max(0, Math.min(1, fnRatio / fnMax));

  const zeroSeg: QualitativeGraphPoint[] = [
    { x: toX(aMin), y: 0 },
    { x: toX(-g), y: 0 },
  ];
  const rampSeg: QualitativeGraphPoint[] = [
    { x: toX(-g), y: 0 },
    { x: toX(aMax), y: toY((g + aMax) / g) },
  ];
  const aCur = Math.max(aMin, Math.min(aMax, params.equivalenceSplit ? 0 : params.cabinAccelMs2));
  const fnRatioCur = Math.max(0, (g + aCur) / g);

  return {
    kind,
    title: 'Apparent Weight F_N / mg vs. Cabin Accel a_y',
    xAxisLabel: 'Vertical Acceleration a_y (from -1.5g to +1.5g)',
    yAxisLabel: 'F_N / (mg)',
    xMarkerPos: toX(aCur),
    yMarkerPos: toY(fnRatioCur),
    markerLabel: `a=${aCur.toFixed(1)}`,
    referenceXPos: toX(0),
    referenceXLabel: 'a = 0',
    segments: [zeroSeg, rampSeg],
    featureCallouts: [
      'a_y = 0: F_N = mg (true weight equals apparent weight, rest or constant velocity).',
      'a_y = -g: F_N = 0 (weightlessness in free fall even though F_g = mg ≠ 0, 2.6.C.3).',
      'a_y > 0: Linear rise F_N = m(g + a_y) with slope m.',
    ],
  };
}

// ============================================================================
// SKILL 2.A — SYMBOLIC DERIVATION PATHWAYS
// ============================================================================
export interface DerivationPathway26 {
  id: string;
  title: string;
  ekCode: string;
  goal: string;
  steps: {
    label: string;
    equation: string;
    justification: string;
  }[];
  finalExpression: string;
}

export const DERIVATION_PATHWAYS_26: DerivationPathway26[] = [
  {
    id: 'derive_field',
    title: 'Gravitational Field Strength |g|',
    ekCode: '2.6.A.2.i',
    goal: 'Derive |g| created by mass M at distance r from Newton’s law of universal gravitation.',
    steps: [
      {
        label: 'Step 1 — Fundamental Law',
        equation: '|F_g| = G (M m) / r²',
        justification: 'Newton’s law of universal gravitation (2.6.A.1) between source M and test mass m.',
      },
      {
        label: 'Step 2 — Field Definition',
        equation: '|g| = |F_g| / m',
        justification: 'Gravitational field strength is force per unit test mass (N/kg).',
      },
      {
        label: 'Step 3 — Substitute & Cancel m',
        equation: '|g| = [G M m / r²] / m = G M / r²',
        justification: 'Test mass m cancels out; |g| depends only on source mass M and distance r.',
      },
    ],
    finalExpression: '|g| = G M / r²  (and free-fall |a| = |F_g|/m = |g|)',
  },
  {
    id: 'derive_interior',
    title: 'Linear Force Inside a Uniform Sphere',
    ekCode: '2.6.E.2.iv & 2.6.E.3',
    goal: 'Show that gravitational force inside a uniform sphere of density ρ is proportional to r.',
    steps: [
      {
        label: 'Step 1 — Shell Theorem Exclusion',
        equation: 'F_g(r) = -G (m_partial · m) / r²',
        justification: 'By Newton’s shell theorem (2.6.E.2.i & iii), outer mass shells (r′ > r) exert zero net force.',
      },
      {
        label: 'Step 2 — Enclosed Partial Mass',
        equation: 'm_partial = ρ · (4/3) π r³',
        justification: 'Uniform density ρ = M / [(4/3)πR³] times the enclosed sphere volume of radius r.',
      },
      {
        label: 'Step 3 — Substitute & Simplify',
        equation: 'F_{g,partial} = -G [ρ (4/3) π r³] m / r² = -(4/3 π G ρ m) r',
        justification: 'The factor r³/r² simplifies directly to r, giving a Hooke-like linear restoring law.',
      },
    ],
    finalExpression: 'F_{g,partial} = -k r_{partial},  with k = (4/3)π G ρ m = G M m / R³',
  },
  {
    id: 'derive_apparent',
    title: 'Apparent Weight in Accelerating Frame',
    ekCode: '2.6.C.1–2.6.C.3',
    goal: 'Derive the floor scale reading F_N for an observer accelerating vertically at a_y.',
    steps: [
      {
        label: 'Step 1 — Vertical Free-Body Diagram',
        equation: 'ΣF_y = F_N - F_g = F_N - m g',
        justification: 'Choose +y upward; normal force acts upward, gravitational force mg acts downward.',
      },
      {
        label: 'Step 2 — Newton’s Second Law',
        equation: 'F_N - m g = m a_y',
        justification: 'Net vertical force equals mass times vertical acceleration of the system.',
      },
      {
        label: 'Step 3 — Solve for Apparent Weight',
        equation: 'F_N = m (g + a_y)',
        justification: 'Weightlessness (F_N = 0) occurs directly when a_y = -g (pure gravitational free fall).',
      },
    ],
    finalExpression: 'F_N = m(g + a_y)  →  0 when a_y = -g',
  },
  {
    id: 'derive_equivalence',
    title: 'Mass Equivalence & Free-Fall Independence',
    ekCode: '2.6.D.1–2.6.D.3',
    goal: 'Relate gravitational mass m_g and inertial mass m_i to explain why all bodies fall at the same rate.',
    steps: [
      {
        label: 'Step 1 — Gravitational Interaction',
        equation: 'F_g = m_g · g',
        justification: 'Gravitational mass m_g determines the strength of gravitational pull (2.6.D.2).',
      },
      {
        label: 'Step 2 — Inertial Resistance',
        equation: 'a = F_net / m_i = (m_g / m_i) · g',
        justification: 'Inertial mass m_i resists acceleration under Newton’s second law (2.6.D.1).',
      },
      {
        label: 'Step 3 — Experimental Equivalence',
        equation: 'm_g = m_i  ⇒  a = g',
        justification: 'Experiments verify m_g = m_i (2.6.D.3), so acceleration equals local |g| for all masses.',
      },
    ],
    finalExpression: 'a = (m_g / m_i) g = g  (independent of mass)',
  },
];

// ============================================================================
// SKILL 2.D — FUNCTIONAL DEPENDENCE SCALING PREDICTOR
// ============================================================================
export interface GravityScalingPrediction {
  universalForceFactor: number;
  fieldStrengthFactor: number;
  interiorUniformForceFactor: number; // Scaling of F_{g,partial} when density ρ is fixed and r scales by rFactor, m by mFactor
  surfaceGNewRadiusFactor: number; // If same M is compressed/expanded to new radius rFactor * R
  explanation: string;
}

export function computeGravityScalingPrediction(
  massMFactor: number,
  testMassFactor: number,
  distanceFactor: number
): GravityScalingPrediction {
  const kM = Math.max(0.1, massMFactor);
  const km = Math.max(0.1, testMassFactor);
  const kr = Math.max(0.1, distanceFactor);

  const universalForceFactor = (kM * km) / (kr * kr);
  const fieldStrengthFactor = kM / (kr * kr);
  // Inside a uniform sphere of fixed density ρ: F = (4/3)π G ρ m r -> scales linearly with km * kr
  const interiorUniformForceFactor = km * kr;
  // Surface gravity g_s = GM/R² -> scales as kM / kr²
  const surfaceGNewRadiusFactor = kM / (kr * kr);

  const explanation = `Scaling M by ${kM}×, m by ${km}×, and r by ${kr}× changes |F_g| = GMm/r² by (${kM}·${km})/${kr}² = ${universalForceFactor.toFixed(3)}×, while |g| = GM/r² changes by ${fieldStrengthFactor.toFixed(3)}× (independent of test mass m).`;

  return {
    universalForceFactor,
    fieldStrengthFactor,
    interiorUniformForceFactor,
    surfaceGNewRadiusFactor,
    explanation,
  };
}

// ============================================================================
// SKILL 3.B — AP CLAIM VERIFICATION SUITE
// ============================================================================
export interface GravityClaim3B {
  id: string;
  ekCode: string;
  statement: string;
  verdict: 'true' | 'false';
  explanation: string;
}

export const AP_CLAIMS_26: GravityClaim3B[] = [
  {
    id: 'c26-1',
    ekCode: '2.6.A.1 & 2.6.A.2',
    statement:
      'If a 20 kg probe replaces a 2 kg probe at the same orbital radius r around Earth, the gravitational field strength |g| at that point increases by a factor of 10.',
    verdict: 'false',
    explanation:
      'FALSE. The gravitational force F_g increases 10×, but gravitational field strength |g| = |F_g|/m = GM/r² is a property of the source mass M and position r, completely independent of the test mass m.',
  },
  {
    id: 'c26-2',
    ekCode: '2.6.B.1 & 2.6.B.2',
    statement:
      'Modeling F_g = mg as constant (g ≈ 10 N/kg) is valid for a ball dropped from a 15 m roof on Earth because the change in center-to-center distance r is negligible compared to Earth’s radius R.',
    verdict: 'true',
    explanation:
      'TRUE. Since Δr = 15 m ≪ R_E = 6.37×10⁶ m, g changes by less than 0.0005%, so the gravitational force is effectively constant throughout the drop (2.6.B.1).',
  },
  {
    id: 'c26-3',
    ekCode: '2.6.C.2 & 2.6.C.3',
    statement:
      'An astronaut floating weightlessly inside a freely falling elevator or orbiting space station experiences zero gravitational force from Earth.',
    verdict: 'false',
    explanation:
      'FALSE. Apparent weight is the normal force F_N = 0 (2.6.C.1, 2.6.C.3). Gravity is still exerting F_g = mg ≠ 0; in fact, weightlessness occurs precisely because gravity is the ONLY force acting on both astronaut and cabin.',
  },
  {
    id: 'c26-4',
    ekCode: '2.6.C.4',
    statement:
      'An observer inside a windowless spaceship accelerating at 9.8 m/s² in empty deep space cannot distinguish the apparent weight of objects from being at rest in a uniform 9.8 N/kg gravitational field.',
    verdict: 'true',
    explanation:
      'TRUE. By the equivalence principle (2.6.C.4), local mechanical experiments (scale readings F_N = ma vs mg, dropped balls) produce identical results in a uniformly accelerating noninertial frame and a uniform gravitational field.',
  },
  {
    id: 'c26-5',
    ekCode: '2.6.E.2.i',
    statement:
      'A small satellite placed off-center inside a uniform thin hollow spherical shell is pulled toward the nearest wall of the shell.',
    verdict: 'false',
    explanation:
      'FALSE. By Newton’s shell theorem (2.6.E.2.i), the net gravitational force is ZERO at EVERY interior point of a thin uniform spherical shell—the smaller nearby patch’s stronger 1/r² pull is exactly canceled by the larger opposite patch.',
  },
  {
    id: 'c26-6',
    ekCode: '2.6.E.2.iv & 2.6.E.3',
    statement:
      'Halfway down to the center of a uniform solid planet (r = R/2), the gravitational field strength is half of the surface value (g_0 / 2), not four times larger.',
    verdict: 'true',
    explanation:
      'TRUE. Only the enclosed mass m_partial = M(r/R)³ = M/8 contributes (2.6.E.2.iii–iv). Dividing by (R/2)² gives g(R/2) = G(M/8)/(R²/4) = (1/2)GM/R² = g_0/2, obeying the linear law F_{g,partial} = -kr (2.6.E.3).',
  },
];
