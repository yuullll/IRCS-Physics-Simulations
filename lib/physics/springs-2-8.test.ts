import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SPRINGS28_PARAMS,
  INITIAL_SPRING_TRIALS_28,
  buildSpringChart28,
  computeEquivalentSpringConstant,
  computeSpringForceN,
  evaluateCombinationSprings,
  evaluateHookesRestoring,
  evaluateSprings28,
  evaluateVerticalEquilibrium,
  solveSpringCalculation28,
} from './springs-2-8';

test('2.8.A.1–3: Ideal Hooke law is strictly linear and restoring; nonideal deviates nonlinearly', () => {
  const fStretch = computeSpringForceN(50, 0.4, 'ideal');
  const fCompress = computeSpringForceN(50, -0.4, 'ideal');
  assert.equal(fStretch, -20);
  assert.equal(fCompress, 20);

  // Hardening nonideal spring produces larger magnitude at same stretch while remaining restoring
  const fHard = computeSpringForceN(50, 0.4, 'nonideal_hardening');
  assert.ok(fHard < fStretch, 'Hardening spring restoring force should exceed linear Hooke magnitude');

  // Softening nonideal spring produces smaller magnitude while remaining restoring
  const fSoft = computeSpringForceN(50, 0.4, 'nonideal_softening');
  assert.ok(fSoft < 0 && Math.abs(fSoft) < Math.abs(fStretch), 'Softening spring should be sub-linear');

  // Ideal oscillation returns to -x0 at half-period T/2
  const halfT = Math.PI * Math.sqrt(DEFAULT_SPRINGS28_PARAMS.hookeMassKg / DEFAULT_SPRINGS28_PARAMS.hookeKNm);
  const atHalf = evaluateHookesRestoring(DEFAULT_SPRINGS28_PARAMS, halfT);
  assert.ok(Math.abs(atHalf.displacementM + DEFAULT_SPRINGS28_PARAMS.hookeDisplacementM) < 1e-3);
});

test('2.8.A.1 & 2.8.A.3: Vertical equilibrium shifts by mg/k and net force restores toward y_eq', () => {
  const idealVert = evaluateVerticalEquilibrium(
    { ...DEFAULT_SPRINGS28_PARAMS, verticalKNm: 50, verticalMassKg: 2.0, verticalOffsetM: -0.2, verticalSpringMassKg: 0 },
    0
  );
  // Δy_eq = mg/k = 2 * 9.81 / 50 = 0.3924 m
  assert.ok(Math.abs(idealVert.equilibriumStretchM - (2 * 9.81) / 50) < 1e-6);
  // Displaced 0.2 m DOWN (η = -0.2), net force must point UP (+k * 0.2 = +10 N) toward equilibrium!
  assert.ok(Math.abs(idealVert.netForceUpN - 10.0) < 1e-6);

  // Nonideal massive spring adds self-weight sag m_s g / (2k) and lowers angular frequency
  const heavyVert = evaluateVerticalEquilibrium(
    { ...DEFAULT_SPRINGS28_PARAMS, verticalKNm: 50, verticalMassKg: 2.0, verticalOffsetM: 0, verticalSpringMassKg: 1.2 },
    0
  );
  assert.ok(heavyVert.equilibriumStretchM > idealVert.equilibriumStretchM);
  assert.ok(heavyVert.angularFreqRadS < idealVert.angularFreqRadS);
});

test('2.8.B.1.i–ii: Series k_eq equals reciprocal sum and is strictly smaller than smallest k', () => {
  const kEq2 = computeEquivalentSpringConstant([30, 60], 'series');
  assert.ok(Math.abs(kEq2 - 20) < 1e-6);
  assert.ok(kEq2 < 30);

  const kEq3 = computeEquivalentSpringConstant([20, 60, 120], 'series');
  assert.ok(Math.abs(kEq3 - 1 / (1 / 20 + 1 / 60 + 1 / 120)) < 1e-6);
  assert.ok(kEq3 < 20);

  const ser = evaluateCombinationSprings(
    { ...DEFAULT_SPRINGS28_PARAMS, comboCount: 2, k1Nm: 30, k2Nm: 60, comboAppliedForceN: 20 },
    'series',
    0
  );
  assert.equal(ser.kEqSmallerThanMin, true);
  // Same force 20 N in both springs; stretches sum to 20/30 + 20/60 = 1.0 m = 20 / k_eq
  assert.ok(Math.abs(ser.springs[0].forceN - 20) < 1e-6);
  assert.ok(Math.abs(ser.springs[1].forceN - 20) < 1e-6);
  assert.ok(Math.abs(ser.springs[0].stretchM + ser.springs[1].stretchM - ser.staticStretchM) < 1e-6);
});

test('2.8.B.1.iii: Parallel k_eq equals sum of spring constants; forces add at identical stretch', () => {
  const kEqPar = computeEquivalentSpringConstant([30, 60, 45], 'parallel');
  assert.equal(kEqPar, 135);

  const par = evaluateCombinationSprings(
    { ...DEFAULT_SPRINGS28_PARAMS, comboCount: 2, k1Nm: 30, k2Nm: 60, comboAppliedForceN: 18 },
    'parallel',
    0
  );
  assert.equal(par.kEqNm, 90);
  assert.equal(par.kEqLargerThanMax, true);
  // Same stretch 0.20 m on both springs; forces are 6 N and 12 N summing to 18 N
  assert.ok(Math.abs(par.springs[0].stretchM - 0.2) < 1e-6);
  assert.ok(Math.abs(par.springs[1].stretchM - 0.2) < 1e-6);
  assert.ok(Math.abs(par.springs[0].forceN - 6) < 1e-6);
  assert.ok(Math.abs(par.springs[1].forceN - 12) < 1e-6);
});

test('Skill 2.D functional dependence: Identical springs series vs parallel gives exact 4x stiffness ratio', () => {
  const k = 45;
  const kSer = computeEquivalentSpringConstant([k, k], 'series');
  const kPar = computeEquivalentSpringConstant([k, k], 'parallel');
  assert.ok(Math.abs(kPar / kSer - 4.0) < 1e-9);
});

test('Skills 1.A & 2.B: Chart generator and quantitative solver return valid finite values for all modes', () => {
  const modes = ['hookes_restoring', 'vertical_equilibrium', 'series_springs', 'parallel_springs'] as const;
  for (const mode of modes) {
    const p = { ...DEFAULT_SPRINGS28_PARAMS, mode };
    const ev = evaluateSprings28(p, 0.3);
    const chart1 = buildSpringChart28(p, ev, 'fs_vs_dx', INITIAL_SPRING_TRIALS_28);
    const chart2 = buildSpringChart28(p, ev, 'series_vs_parallel', INITIAL_SPRING_TRIALS_28);
    const sol = solveSpringCalculation28(p, ev);

    assert.ok(Number.isFinite(chart1.markerX) && Number.isFinite(chart1.markerY));
    assert.ok(Number.isFinite(chart2.markerX) && Number.isFinite(chart2.markerY));
    assert.ok(sol.steps.length === 4 && sol.finalAnswer.length > 0);
    assert.ok(ev.statusBanner.length > 10);
  }
});
