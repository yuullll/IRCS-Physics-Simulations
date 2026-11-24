import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AP_CLAIMS_25,
  EXPERIMENTAL_PROCEDURE_3A,
  G_ACCEL,
  applyTrackPresetParams,
  buildQuantitativeGraphLayout25,
  computeScalingPrediction,
  createDefaultNewton25Params,
  evaluateNewton25,
} from './newton-second-law-2-5';

describe('Topic 2.5 Newton’s Second Law', () => {
  it('2.5.A.1 & 2.5.A.2: 1D unbalanced track satisfies a_sys = ΣF/m_sys, braking opposes v, and balanced gives a=0', () => {
    const base = createDefaultNewton25Params('unbalanced_track');
    const ev = evaluateNewton25(base);
    // Default: F_fwd=24, F_res=8, m=4 => F_net=16, a=+4.0 m/s^2
    assert.equal(ev.isUnbalanced, true);
    assert.equal(ev.fNetX, 16);
    assert.equal(ev.axSys, 4);
    assert.equal(ev.motionState, 'speeding_up');

    // Braking preset: v0 = +5 m/s, F_net = 4 - 20 = -16 N, m = 4 kg => a = -4 m/s^2 (opposes v)
    const braking = applyTrackPresetParams(base, 'braking');
    const evBrake = evaluateNewton25(braking);
    assert.equal(evBrake.fNetX, -16);
    assert.equal(evBrake.axSys, -4);
    assert.equal(evBrake.aAngleDeg, 180);
    assert.equal(evBrake.fNetAngleDeg, 180);
    assert.equal(evBrake.motionState, 'slowing_down');

    // Balanced preset: F_fwd=16, F_res=16 => F_net=0, a=0
    const bal = applyTrackPresetParams(base, 'balanced');
    const evBal = evaluateNewton25(bal);
    assert.equal(evBal.isUnbalanced, false);
    assert.equal(evBal.axSys, 0);
    assert.equal(evBal.vxNow, bal.initialVelMs);
  });

  it('2.5.A.2: 2D vector dynamics ensures |a| = |F_net|/m and exact direction alignment θ_a = θ_F', () => {
    const p = {
      ...createDefaultNewton25Params('vector_2d'),
      puckMassKg: 2.0,
      f1MagN: 6.0,
      f1AngleDeg: 0,
      f2MagN: 8.0,
      f2AngleDeg: 90,
      puckVx0Ms: 3.0,
      simTimeS: 1.0,
    };
    const ev = evaluateNewton25(p);
    // 6-8-10 right triangle => |F_net| = 10 N, m = 2 kg => |a| = 5 m/s^2
    assert.ok(Math.abs(ev.fNetMag - 10) < 1e-6);
    assert.ok(Math.abs(ev.aMagSys - 5) < 1e-6);
    assert.ok(Math.abs(ev.aAngleDeg - ev.fNetAngleDeg) < 1e-6);
    // Position at t=1s: x = 3*1 + 0.5*3*1 = 4.5, y = 0.5*4*1 = 2.0
    assert.ok(Math.abs(ev.posX - 4.5) < 1e-6);
    assert.ok(Math.abs(ev.posY - 2.0) < 1e-6);
  });

  it('2.5.A.2 & 3.A: Modified Atwood yields a = m_2 g/(m_1+m_2), T < m_2 g, and exact linearity when total mass locked', () => {
    const p1 = {
      ...createDefaultNewton25Params('modified_atwood'),
      lockTotalMass: true,
      totalSystemMassKg: 4.0,
      hang2MassKg: 0.5,
    };
    const p2 = { ...p1, hang2MassKg: 1.5 };
    const ev1 = evaluateNewton25(p1);
    const ev2 = evaluateNewton25(p2);

    assert.equal(ev1.systemMassKg, 4.0);
    assert.equal(ev2.systemMassKg, 4.0);
    assert.ok(Math.abs(ev1.axSys - (0.5 * G_ACCEL) / 4.0) < 1e-6);
    assert.ok(Math.abs(ev2.axSys - (1.5 * G_ACCEL) / 4.0) < 1e-6);
    // Tripling hanging mass at constant total mass triples acceleration exactly
    assert.ok(Math.abs(ev2.axSys / ev1.axSys - 3.0) < 1e-6);
    // Internal tension strictly less than hanging weight
    assert.ok(ev1.atwoodTensionN < ev1.atwoodHangingWeightN);
    assert.ok(ev2.atwoodTensionN < ev2.atwoodHangingWeightN);
  });

  it('2.5.A.3: Internal spring push-off leaves COM velocity & acceleration strictly invariant; only F_ext accelerates COM', () => {
    const base = {
      ...createDefaultNewton25Params('com_system'),
      massAKg: 2.0,
      massBKg: 4.0,
      externalForceN: 0.0,
      comV0Ms: 2.5,
      simTimeS: 1.4,
      internalSpringImpulseNs: 12.0,
      springTriggered: true,
    };
    const evZeroExt = evaluateNewton25(base);
    assert.equal(evZeroExt.aCmNow, 0);
    assert.equal(evZeroExt.vCmNow, 2.5);
    assert.ok(evZeroExt.vANow < evZeroExt.vCmNow && evZeroExt.vBNow > evZeroExt.vCmNow);
    // Exact COM invariant check: (mA*xA + mB*xB)/(mA+mB) === xCmNow
    const recomputedXcm = (base.massAKg * evZeroExt.xANow + base.massBKg * evZeroExt.xBNow) / (base.massAKg + base.massBKg);
    assert.ok(Math.abs(recomputedXcm - evZeroExt.xCmNow) < 1e-6);

    // Now add external force = +12 N on 6 kg system => a_cm = +2.0 m/s^2 regardless of spring
    const evWithExt = evaluateNewton25({ ...base, externalForceN: 12.0 });
    const evNoSpring = evaluateNewton25({ ...base, externalForceN: 12.0, springTriggered: false });
    assert.ok(Math.abs(evWithExt.aCmNow - 2.0) < 1e-6);
    assert.equal(evWithExt.vCmNow, evNoSpring.vCmNow);
    assert.equal(evWithExt.xCmNow, evNoSpring.xCmNow);
  });

  it('Skills 1.B, 2.B, 2.D, 3.A, 3.C: Graphs bounded, scaling factor exact, procedures & claims valid, zero combining arrows', () => {
    const scaling = computeScalingPrediction(16, 4, 3, 2);
    assert.equal(scaling.baseAccelMs2, 4);
    assert.equal(scaling.accelFactor, 1.5);
    assert.equal(scaling.predictedAccelMs2, 6);

    const p = createDefaultNewton25Params('unbalanced_track');
    const ev = evaluateNewton25(p);
    const plotted = [
      { id: 'pt-1', fNetN: 16, massKg: 4, invMassPerKg: 0.25, accelMs2: 4, label: 'T1' },
    ];
    for (const kind of ['a_vs_f', 'a_vs_m', 'a_vs_inv_m', 'v_vs_t'] as const) {
      const g = buildQuantitativeGraphLayout25(p, ev, kind, plotted, 278, 148);
      assert.ok(g.curvePath.startsWith('M'));
      assert.ok(g.currentPoint.px >= 0 && g.currentPoint.px <= 278);
      assert.ok(g.currentPoint.py >= 0 && g.currentPoint.py <= 148);
      assert.ok(!g.title.includes('\u20D7'));
    }

    assert.equal(EXPERIMENTAL_PROCEDURE_3A.length, 3);
    for (const step of EXPERIMENTAL_PROCEDURE_3A) {
      assert.equal(step.options.filter(o => o.correct).length, 1);
      assert.ok(!step.prompt.includes('\u20D7'));
    }

    assert.equal(AP_CLAIMS_25.length, 4);
    for (const c of AP_CLAIMS_25) {
      assert.ok(!c.statement.includes('\u20D7'));
      assert.ok(!c.evidence.includes('\u20D7'));
    }
  });
});
