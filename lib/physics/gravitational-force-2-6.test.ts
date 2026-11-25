import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AP_CLAIMS_26,
  ASTRO_BODIES,
  DERIVATION_PATHWAYS_26,
  EARTH_G_EXACT,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  G_UNIVERSAL,
  applyElevatorPreset,
  buildQualitativeGraph26,
  computeGravityScalingPrediction,
  createDefaultGravity26Params,
  evaluateApparentWeight,
  evaluateGravity26,
  evaluateNearSurface,
  evaluateShellTheorem,
  evaluateUniversalField,
} from './gravitational-force-2-6';

test('2.6.A.1 & 2.6.A.2: Universal gravitation follows inverse-square law and |g| is independent of test mass m', () => {
  const base = createDefaultGravity26Params('universal_field');
  const r2_m10 = evaluateUniversalField({ ...base, primaryMassFactor: 1, testMassKg: 10, separationInR: 2 });
  const r2_m50 = evaluateUniversalField({ ...base, primaryMassFactor: 1, testMassKg: 50, separationInR: 2 });
  const r4_m10 = evaluateUniversalField({ ...base, primaryMassFactor: 1, testMassKg: 10, separationInR: 4 });

  // |g| at r = 2R_E must equal exactly (1/4) g_surface regardless of m
  assert.ok(Math.abs(r2_m10.fieldStrengthNPerKg - EARTH_G_EXACT / 4) < 1e-6);
  assert.ok(Math.abs(r2_m50.fieldStrengthNPerKg - r2_m10.fieldStrengthNPerKg) < 1e-9);
  // F_g scales linearly with m
  assert.ok(Math.abs(r2_m50.gravitationalForceN - 5 * r2_m10.gravitationalForceN) < 1e-6);
  // Doubling distance quarters force and field
  assert.ok(Math.abs(r4_m10.gravitationalForceN - r2_m10.gravitationalForceN / 4) < 1e-6);
  // 2.6.A.2.ii: Free-fall acceleration (m/s²) numerically equals |g| (N/kg)
  assert.ok(Math.abs(r2_m10.observedAccelMs2 - r2_m10.fieldStrengthNPerKg) < 1e-9);
  assert.ok(Math.abs(r2_m50.observedAccelMs2 - r2_m10.observedAccelMs2) < 1e-9);
});

test('2.6.B & 2.6.D: Near-surface constant-g validity and inertial/gravitational mass equivalence', () => {
  const base = createDefaultGravity26Params('near_surface');
  const near = evaluateNearSurface({ ...base, bodyPreset: 'earth', altitudeKm: 1, dropMassHeavyKg: 12, dropMassLightKg: 1, hypotheticalMgOverMi: 1.0 });
  const high = evaluateNearSurface({ ...base, bodyPreset: 'earth', altitudeKm: ASTRO_BODIES.earth.radiusKm });

  // Near surface: g ≈ 9.82 N/kg (≈ 10 N/kg per 2.6.B.2) and negligible change (< 1%)
  assert.equal(near.constantGValid, true);
  assert.ok(Math.abs(near.percentChange) < 0.05);
  assert.ok(near.gAtAltitude > 9.75 && near.gAtAltitude < 9.9);

  // At h = R_E (r = 2R_E): g drops by exactly 75%
  assert.equal(high.constantGValid, false);
  assert.ok(Math.abs(high.percentChange - -75.0) < 0.05);

  // 2.6.D.3: When m_g = m_i, 12 kg and 1 kg bodies have 12x different F_g yet identical acceleration
  assert.ok(Math.abs(near.heavyFgN / near.lightFgN - 12) < 1e-9);
  assert.ok(Math.abs(near.heavyAccelMs2 - near.lightAccelMs2) < 1e-9);
});

test('2.6.C: Apparent weight F_N = m(g + a_y), free-fall weightlessness, and Equivalence Principle', () => {
  const base = createDefaultGravity26Params('apparent_weight');
  const rest = evaluateApparentWeight(applyElevatorPreset({ ...base, riderMassKg: 60, planetG: 9.8 }, 'rest'));
  const up = evaluateApparentWeight(applyElevatorPreset({ ...base, riderMassKg: 60, planetG: 9.8 }, 'accel_up'));
  const down = evaluateApparentWeight(applyElevatorPreset({ ...base, riderMassKg: 60, planetG: 9.8 }, 'accel_down'));
  const freeFall = evaluateApparentWeight(applyElevatorPreset({ ...base, riderMassKg: 60, planetG: 9.8 }, 'free_fall'));
  const equiv = evaluateApparentWeight(applyElevatorPreset({ ...base, riderMassKg: 60, planetG: 9.8 }, 'equivalence'));

  assert.ok(Math.abs(rest.apparentWeightFnN - 588) < 1e-6);
  assert.ok(up.apparentWeightFnN > up.trueWeightFgN);
  assert.ok(down.apparentWeightFnN < down.trueWeightFgN && down.apparentWeightFnN > 0);
  // 2.6.C.3: Weightless in free fall (F_N = 0), while F_g = mg still equals 588 N
  assert.equal(freeFall.isWeightless, true);
  assert.equal(freeFall.apparentWeightFnN, 0);
  assert.ok(Math.abs(freeFall.trueWeightFgN - 588) < 1e-6);
  // 2.6.C.4: Equivalence principle — rocket at a = g matches planet scale reading exactly
  assert.ok(Math.abs(equiv.equivalenceRocketFnN - equiv.trueWeightFgN) < 1e-9);
});

test('2.6.E: Newton Shell Theorem — zero inside hollow shell, linear F=-kr inside uniform solid sphere, continuous at r=R', () => {
  const base = createDefaultGravity26Params('shell_theorem');

  // Hollow shell inside: F_g = 0 everywhere for r < R (including off-center r = 0.7R)
  const hollowInside = evaluateShellTheorem({ ...base, shellKind: 'hollow_shell', probeRadiusRatio: 0.7, probeMassKg: 10 });
  assert.equal(hollowInside.isInside, true);
  assert.equal(hollowInside.gravitationalForceN, 0);
  assert.equal(hollowInside.fieldStrengthNPerKg, 0);

  // Hollow shell outside: identical to point mass at center
  const hollowOut = evaluateShellTheorem({ ...base, shellKind: 'hollow_shell', probeRadiusRatio: 2.0, probeMassKg: 10 });
  const expectedOutF = (G_UNIVERSAL * EARTH_MASS_KG * 10) / Math.pow(2 * EARTH_RADIUS_M, 2);
  assert.ok(Math.abs(hollowOut.gravitationalForceN - expectedOutF) < 1e-6);

  // Uniform solid sphere inside at r = 0.5R: partial mass = (1/8)M, g = g_surface / 2, F = -kr
  const solidHalf = evaluateShellTheorem({ ...base, shellKind: 'solid_sphere', probeRadiusRatio: 0.5, probeMassKg: 10 });
  const solidSurface = evaluateShellTheorem({ ...base, shellKind: 'solid_sphere', probeRadiusRatio: 1.0, probeMassKg: 10 });
  assert.ok(Math.abs(solidHalf.partialMassFraction - 0.125) < 1e-9);
  assert.ok(Math.abs(solidHalf.partialMassKg - EARTH_MASS_KG / 8) / EARTH_MASS_KG < 1e-9);
  assert.ok(Math.abs(solidHalf.fieldStrengthNPerKg - solidSurface.fieldStrengthNPerKg / 2) < 1e-6);
  assert.ok(Math.abs(solidHalf.signedRadialForceN - -solidHalf.effectiveK_NPerM * (0.5 * EARTH_RADIUS_M)) < 1e-6);

  // Continuity at r = R: k * R equals G M m / R²
  const fLinearAtR = solidHalf.effectiveK_NPerM * EARTH_RADIUS_M;
  assert.ok(Math.abs(fLinearAtR - solidSurface.gravitationalForceN) < 1e-6);
});

test('Skills 1.C, 2.A, 2.D, 3.B: Qualitative graphs, symbolic derivations, scaling predictions, and AP claims', () => {
  const params = createDefaultGravity26Params('shell_theorem');
  const evaluation = evaluateGravity26(params);

  const solidGraph = buildQualitativeGraph26(params, evaluation, 'solid_g_vs_r');
  const hollowGraph = buildQualitativeGraph26(params, evaluation, 'hollow_g_vs_r');
  assert.equal(solidGraph.segments.length, 2);
  assert.equal(hollowGraph.segments[0][1].y, 0);
  assert.equal(hollowGraph.segments[1][0].y, 1);

  // Skill 2.D scaling: 2x M, 3x m, 2x r => F_g scales by (2*3)/4 = 1.5x, |g| scales by 2/4 = 0.5x
  const scale = computeGravityScalingPrediction(2, 3, 2);
  assert.ok(Math.abs(scale.universalForceFactor - 1.5) < 1e-9);
  assert.ok(Math.abs(scale.fieldStrengthFactor - 0.5) < 1e-9);
  assert.ok(Math.abs(scale.interiorUniformForceFactor - 6.0) < 1e-9);

  // Skill 2.A pathways and Skill 3.B claims populated
  assert.ok(DERIVATION_PATHWAYS_26.length >= 4);
  assert.ok(AP_CLAIMS_26.length >= 6);
});
