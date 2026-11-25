import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FRICTION27_PARAMS,
  GRAVITY_G,
  INITIAL_LAB_TRIALS_27,
  buildQuantitativeGraph27,
  evaluateAreaSurfaceCompare,
  evaluateFriction27,
  evaluateHorizontalPull,
  evaluateInclineRamp,
  evaluateStackedBlocks,
  solveFrictionCalculation27,
} from './friction-2-7';

test('2.7.B.2 & 2.7.A.2: Static self-adjustment vs. kinetic breakaway drop', () => {
  // m = 4 kg, g = 9.81, muS = 0.50 -> F_s,max = 19.62 N; muK = 0.30 -> F_k = 11.772 N
  const staticRes = evaluateHorizontalPull(
    { ...DEFAULT_FRICTION27_PARAMS, massKg: 4, appliedForceN: 10, pullAngleDeg: 0, muS: 0.5, muK: 0.3 },
    0,
    false
  );
  assert.equal(staticRes.regime, 'static');
  assert.ok(Math.abs(staticRes.actualFrictionN - 10) < 1e-6);
  assert.equal(staticRes.accelMs2, 0);

  // Exceed peak static friction -> drops to kinetic friction and accelerates
  const kineticRes = evaluateHorizontalPull(
    { ...DEFAULT_FRICTION27_PARAMS, massKg: 4, appliedForceN: 24, pullAngleDeg: 0, muS: 0.5, muK: 0.3 },
    1.0,
    true
  );
  assert.equal(kineticRes.regime, 'kinetic');
  assert.ok(Math.abs(kineticRes.actualFrictionN - 0.3 * 4 * GRAVITY_G) < 1e-6);
  const expectedA = (24 - 0.3 * 4 * GRAVITY_G) / 4;
  assert.ok(Math.abs(kineticRes.accelMs2 - expectedA) < 1e-6);
  assert.ok(kineticRes.displacementM > 0);
});

test('2.7.A.2.ii: Angled upward pull reduces normal force and static threshold', () => {
  const level = evaluateHorizontalPull(
    { ...DEFAULT_FRICTION27_PARAMS, massKg: 4, appliedForceN: 20, pullAngleDeg: 0 },
    0,
    false
  );
  const angledUp = evaluateHorizontalPull(
    { ...DEFAULT_FRICTION27_PARAMS, massKg: 4, appliedForceN: 20, pullAngleDeg: 30 },
    0,
    false
  );
  const expectedFnUp = 4 * GRAVITY_G - 20 * Math.sin(Math.PI / 6);
  assert.ok(Math.abs(angledUp.normalForceN - expectedFnUp) < 1e-6);
  assert.ok(angledUp.normalForceN < level.normalForceN);
  assert.ok(angledUp.maxStaticFrictionN < level.maxStaticFrictionN);
});

test('2.7.A.1.ii: Surface contact area does not affect friction force despite 3x pressure change', () => {
  const cmp = evaluateAreaSurfaceCompare(
    {
      ...DEFAULT_FRICTION27_PARAMS,
      compareMassKg: 4,
      comparePullForceN: 26,
      materialId: 'wood_wood',
      compareLaneBMaterialId: 'wood_wood',
    },
    1.5
  );
  assert.equal(cmp.sameMaterial, true);
  assert.ok(Math.abs(cmp.pressureRatioBOverA - 3.0) < 1e-6);
  assert.ok(Math.abs(cmp.laneA.actualFrictionN - cmp.laneB.actualFrictionN) < 1e-9);
  assert.ok(Math.abs(cmp.laneA.accelMs2 - cmp.laneB.accelMs2) < 1e-9);
  assert.ok(Math.abs(cmp.laneA.displacementM - cmp.laneB.displacementM) < 1e-9);
});

test('2.7.B.2.ii & 2.7.A.1.i: Incline critical angle arctan(mu_s) and uphill velocity friction direction', () => {
  // muS = 0.50 -> theta_c = arctan(0.5) ≈ 26.565 deg
  const below = evaluateInclineRamp(
    { ...DEFAULT_FRICTION27_PARAMS, inclineAngleDeg: 20, muS: 0.5, muK: 0.3, inclineInitialVelocityMs: 0 },
    0
  );
  assert.equal(below.regime, 'static_rest');
  assert.equal(below.signedAccelMs2, 0);
  assert.ok(Math.abs(below.criticalAngleDeg - (Math.atan(0.5) * 180) / Math.PI) < 1e-5);

  const above = evaluateInclineRamp(
    { ...DEFAULT_FRICTION27_PARAMS, inclineAngleDeg: 35, muS: 0.5, muK: 0.3, inclineInitialVelocityMs: 0 },
    1.0
  );
  assert.equal(above.regime, 'kinetic_downhill');
  assert.ok(above.signedFrictionN > 0); // uphill
  assert.ok(above.signedAccelMs2 < 0); // downhill

  // Launched uphill: kinetic friction points DOWNHILL (negative!) while v > 0
  const uphill = evaluateInclineRamp(
    { ...DEFAULT_FRICTION27_PARAMS, inclineAngleDeg: 20, muS: 0.5, muK: 0.3, inclineInitialVelocityMs: 5.0 },
    0.2
  );
  assert.equal(uphill.regime, 'kinetic_uphill');
  assert.ok(uphill.signedFrictionN < 0);
  assert.ok(uphill.velocityMs > 0);
});

test('2.7.A.1.i & 2.7.B.2: Stacked two-block forward static friction and slip transition', () => {
  // m1 = 6, m2 = 2, muSTop = 0.5, muKTop = 0.3, floorMuK = 0 -> F_slip = 8 * 9.81 * 0.5 = 39.24 N
  const noSlip = evaluateStackedBlocks(
    { ...DEFAULT_FRICTION27_PARAMS, bottomMassKg: 6, topMassKg: 2, topMuS: 0.5, topMuK: 0.3, floorMuK: 0, stackPullForceN: 24 },
    1.0
  );
  assert.equal(noSlip.regime, 'static_together');
  assert.equal(noSlip.isSlipping, false);
  assert.ok(noSlip.frictionOnTopN > 0); // forward!
  assert.ok(Math.abs(noSlip.frictionOnTopN + noSlip.frictionOnBottomFromTopN) < 1e-9); // Newton 3rd law pair
  assert.ok(Math.abs(noSlip.accelBottomMs2 - noSlip.accelTopMs2) < 1e-9);
  assert.ok(Math.abs(noSlip.accelTopMs2 - 3.0) < 1e-9); // 24 / 8 = 3 m/s^2

  const slipping = evaluateStackedBlocks(
    { ...DEFAULT_FRICTION27_PARAMS, bottomMassKg: 6, topMassKg: 2, topMuS: 0.5, topMuK: 0.3, floorMuK: 0, stackPullForceN: 50 },
    1.0
  );
  assert.equal(slipping.regime, 'kinetic_slipping');
  assert.equal(slipping.isSlipping, true);
  assert.ok(slipping.frictionOnTopN > 0); // still forward on top block!
  assert.ok(Math.abs(slipping.accelTopMs2 - 0.3 * GRAVITY_G) < 1e-6);
  assert.ok(slipping.accelBottomMs2 > slipping.accelTopMs2);
  assert.ok(slipping.topRelativeOffsetM < 0); // lags backward on sled
});

test('Skills 1.B & 2.B: Quantitative graph builder and calculation solver produce finite physical values', () => {
  const ev = evaluateFriction27(DEFAULT_FRICTION27_PARAMS, 0, false);
  const g1 = buildQuantitativeGraph27(DEFAULT_FRICTION27_PARAMS, ev, 'ff_vs_fapp', INITIAL_LAB_TRIALS_27);
  assert.ok(g1.series.length === 3);
  assert.ok(Number.isFinite(g1.markerX) && Number.isFinite(g1.markerY));

  const g2 = buildQuantitativeGraph27(DEFAULT_FRICTION27_PARAMS, ev, 'ff_vs_fn_lab', INITIAL_LAB_TRIALS_27);
  assert.ok((g2.scatterPoints?.length ?? 0) === INITIAL_LAB_TRIALS_27.length * 2);

  const sol = solveFrictionCalculation27(DEFAULT_FRICTION27_PARAMS, ev);
  assert.ok(sol.steps.length === 4);
  assert.ok(sol.finalAnswer.includes('N'));
});
