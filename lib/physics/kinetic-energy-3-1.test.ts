import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_KINETIC_31_PARAMS,
  Kinetic31Mode,
  SKETCH_CHALLENGES_31,
  RATIO_CHALLENGES_31,
  CLAIM_BUILDER_31,
  JUSTIFICATION_CARDS_31,
  computeKineticEnergy,
  solveScalingTrack,
  solveScalarArena,
  solveObserverFrames,
  solveScenarioCompare,
  evaluateKinetic31,
  getChartTabLabels31,
  buildKineticChartData31,
  buildComparisonRows31,
  buildDerivationSteps31,
} from './kinetic-energy-3-1';

describe('Topic 3.1 Translational Kinetic Energy — Pure Physics Engine', () => {
  it('verifies EK 3.1.A.1: K = 1/2 m v^2, linear mass scaling & quadratic speed scaling', () => {
    // Baseline 2 kg at 5 m/s => 25 J
    assert.equal(computeKineticEnergy(2, 5), 25);
    assert.equal(computeKineticEnergy(2, 0), 0);

    const base = solveScalingTrack(2, 5, 2, 5);
    assert.equal(base.kineticJ, 25);
    assert.equal(base.energyRatio, 1);

    // 2x mass => 2x K
    const doubleMass = solveScalingTrack(4, 5, 2, 5);
    assert.equal(doubleMass.kineticJ, 50);
    assert.equal(doubleMass.massRatio, 2);
    assert.equal(doubleMass.energyRatio, 2);

    // 2x speed => 4x K
    const doubleSpeed = solveScalingTrack(2, 10, 2, 5);
    assert.equal(doubleSpeed.kineticJ, 100);
    assert.equal(doubleSpeed.speedRatio, 2);
    assert.equal(doubleSpeed.speedRatioSquared, 4);
    assert.equal(doubleSpeed.energyRatio, 4);

    // 3x speed => 9x K
    const tripleSpeed = solveScalingTrack(2, 15, 2, 5);
    assert.equal(tripleSpeed.kineticJ, 225);
    assert.equal(tripleSpeed.energyRatio, 9);

    // 0.5x mass and 2x speed => 2x K
    const combined = solveScalingTrack(1, 10, 2, 5);
    assert.equal(combined.kineticJ, 50);
    assert.equal(combined.energyRatio, 2);
  });

  it('verifies EK 3.1.A.2: scalar non-negativity, direction invariance & 2-puck system energy', () => {
    // Negative velocity yields positive K
    assert.equal(computeKineticEnergy(3, -4), 24);

    const expectedK = 0.5 * 2.5 * 6 * 6; // 45 J
    for (const angle of [0, 45, 90, 135, 180, 270, 315]) {
      const sol = solveScalarArena(2.5, 6, angle, false);
      assert.ok(Math.abs(sol.kineticJ - expectedK) < 1e-10);
      assert.ok(Math.abs(sol.kxJ + sol.kyJ - sol.kineticJ) < 1e-10);
      assert.ok(sol.kineticJ >= 0 && sol.kxJ >= 0 && sol.kyJ >= 0);
    }

    // Two-puck opposite system: p_sys = 0 yet K_sys = 2 * K_1 > 0
    const sys = solveScalarArena(2, 6, 30, true);
    assert.equal(sys.sysNetPx, 0);
    assert.equal(sys.sysNetPy, 0);
    assert.equal(sys.sysNetPMag, 0);
    assert.equal(sys.sysTotalKineticJ, 2 * 36);
  });

  it('verifies EK 3.1.A.3: observer frame dependence & Galilean relative kinetic energy', () => {
    // Object P at +8 m/s relative to Earth; Observer O at +3 m/s => v_P/O = +5 m/s
    const f1 = solveObserverFrames(2, 8, 3);
    assert.equal(f1.vObjRelEarthMs, 8);
    assert.equal(f1.vObjRelObserverMs, 5);
    assert.equal(f1.kEarthJ, 64);
    assert.equal(f1.kObserverJ, 25);
    assert.equal(f1.kSelfJ, 0);
    assert.equal(f1.isCoMoving, false);

    // Co-moving observer: v_O/E = v_P/E => K_P/O = 0 while K_P/E > 0
    const comoving = solveObserverFrames(2, 8, 8);
    assert.equal(comoving.vObjRelObserverMs, 0);
    assert.equal(comoving.kObserverJ, 0);
    assert.equal(comoving.kEarthJ, 64);
    assert.equal(comoving.isCoMoving, true);

    // Opposite-moving observer at -v => v_P/O = 2v => K_P/O = 4 K_P/E
    const opposite = solveObserverFrames(2, 6, -6);
    assert.equal(opposite.vObjRelObserverMs, 12);
    assert.equal(opposite.kObserverJ, 4 * opposite.kEarthJ);
    assert.equal(opposite.isOppositeDirection, true);
  });

  it('verifies Skill 2.C multi-scenario comparison (equal momentum, opposite velocity, equal K)', () => {
    // Equal momentum: mA=1, vA=8 (p=8, K=32) vs mB=4, vB=2 (p=8, K=8) => K_A/K_B = mB/mA = 4
    const eqP = solveScenarioCompare(1, 8, 4, 2);
    assert.equal(eqP.pMagA, 8);
    assert.equal(eqP.pMagB, 8);
    assert.equal(eqP.kAJ, 32);
    assert.equal(eqP.kBJ, 8);
    assert.equal(eqP.kRatioBtoA, 0.25);
    assert.equal(eqP.equalMomentumNote, true);
    assert.equal(eqP.winnerLabel, 'A');

    // Opposite velocities same speed & mass => equal K
    const opp = solveScenarioCompare(2, 7, 2, -7);
    assert.equal(opp.kAJ, 49);
    assert.equal(opp.kBJ, 49);
    assert.equal(opp.winnerLabel, 'Equal');
    assert.equal(opp.oppositeDirSameSpeed, true);
  });

  it('builds valid charts, comparison tables, derivations, and challenge banks across all 4 modes', () => {
    const modes: Kinetic31Mode[] = [
      'scaling_track',
      'scalar_arena',
      'observer_frames',
      'scenario_compare',
    ];

    for (const mode of modes) {
      const p = { ...DEFAULT_KINETIC_31_PARAMS, mode };
      const ev = evaluateKinetic31(p);
      assert.ok(ev.keyInsight.length > 20);

      const tabs = getChartTabLabels31(mode);
      assert.equal(tabs.length, 3);

      for (const t of tabs) {
        const chart = buildKineticChartData31(p, ev, t.id);
        assert.ok(chart.curveA.length >= 2);
        assert.ok(Number.isFinite(chart.currentPoint.x));
        assert.ok(Number.isFinite(chart.currentPoint.y));
        assert.ok(chart.xMax > chart.xMin);
        assert.ok(chart.yMax > chart.yMin);
      }

      const rows = buildComparisonRows31(p, ev);
      assert.equal(rows.length, 4);

      const steps = buildDerivationSteps31(p, ev);
      assert.equal(steps.length, 4);
    }

    assert.equal(SKETCH_CHALLENGES_31.length, 4);
    assert.equal(RATIO_CHALLENGES_31.length, 5);
    assert.equal(CLAIM_BUILDER_31.length, 5);
    assert.equal(JUSTIFICATION_CARDS_31.length, 6);
  });
});
