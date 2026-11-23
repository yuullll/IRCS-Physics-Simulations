import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY_G,
  TOPIC_23_CLAIM_QUESTIONS,
  createDefaultNewton23Params,
  evaluateNewton23,
} from './newton-third-law-2-3';

test('Topic 2.3 Newton’s Third Law', async t => {
  await t.test('2.3.A.1: Contact push & push-off enforce F_A on B = -F_B on A across unequal masses', () => {
    const pushParams = {
      ...createDefaultNewton23Params('action_reaction'),
      arPreset: 'contact_push' as const,
      massA: 2.0,
      massB: 8.0,
      appliedForceN: 50,
    };
    const evPush = evaluateNewton23(pushParams);
    assert.equal(evPush.pairEqualVerified, true);
    assert.ok(Math.abs(evPush.accelA_x - 5.0) < 1e-6);
    assert.ok(Math.abs(evPush.pairMagAonB - 40.0) < 1e-6);
    assert.ok(Math.abs(evPush.pairMagBonA - 40.0) < 1e-6);

    const fBonA = evPush.forcesA.find(f => f.id === 'a-from-b');
    const fAonB = evPush.forcesB.find(f => f.id === 'b-from-a');
    assert.ok(fBonA && fAonB);
    assert.ok(Math.abs(fBonA.fx + fAonB.fx) < 1e-6);
    assert.equal(fBonA.onObject, 'A');
    assert.equal(fAonB.onObject, 'B');

    // Receding push-off with unequal masses: equal forces, inversely proportional accelerations, a_cm = 0
    const offParams = {
      ...createDefaultNewton23Params('action_reaction'),
      arPreset: 'ice_pushoff' as const,
      massA: 2.5,
      massB: 7.5,
      appliedForceN: 30,
    };
    const evOff = evaluateNewton23(offParams);
    assert.ok(Math.abs(evOff.pairMagAonB - 30) < 1e-6);
    assert.ok(Math.abs(evOff.pairMagBonA - 30) < 1e-6);
    assert.ok(Math.abs(evOff.accelA_x - -12.0) < 1e-6);
    assert.ok(Math.abs(evOff.accelB_x - 4.0) < 1e-6);
    assert.ok(Math.abs(evOff.accelCom_x) < 1e-6);

    // Book & Earth: true gravity pair acts on Book & Earth (different objects)
    const bookParams = {
      ...createDefaultNewton23Params('action_reaction'),
      arPreset: 'book_earth' as const,
      massA: 3.0,
    };
    const evBook = evaluateNewton23(bookParams);
    const fEonBk = evBook.forcesA.find(f => f.id === 'book-fg');
    const fBkonE = evBook.forcesB.find(f => f.id === 'earth-fg');
    assert.ok(fEonBk && fBkonE);
    assert.ok(Math.abs(fEonBk.fy + fBkonE.fy) < 1e-6);
    assert.ok(Math.abs(fBkonE.fy - 3.0 * GRAVITY_G) < 1e-5);
  });

  await t.test('2.3.A.2: Internal spring forces sum to zero and leave a_cm strictly invariant to internal amplitude', () => {
    const lowInt = evaluateNewton23({
      ...createDefaultNewton23Params('internal_com'),
      massA: 4.0,
      massB: 6.0,
      externalForceN: 20,
      internalForceAmpN: 5,
      simTimeS: 0.7,
    });
    const highInt = evaluateNewton23({
      ...createDefaultNewton23Params('internal_com'),
      massA: 4.0,
      massB: 6.0,
      externalForceN: 20,
      internalForceAmpN: 45,
      simTimeS: 0.7,
    });
    assert.ok(Math.abs(lowInt.accelCom_x - 2.0) < 1e-6);
    assert.ok(Math.abs(highInt.accelCom_x - 2.0) < 1e-6);
    assert.ok(Math.abs(lowInt.posCom_x - highInt.posCom_x) < 1e-6);
    assert.equal(highInt.netInternalForceSumX, 0);
    // Weighted mass-acceleration check: (mA*aA + mB*aB)/(mA+mB) === a_cm
    const weightedAcm = (4.0 * highInt.accelA_x + 6.0 * highInt.accelB_x) / 10.0;
    assert.ok(Math.abs(weightedAcm - highInt.accelCom_x) < 1e-6);
  });

  await t.test('2.3.A.3.i–iii: Ideal string has uniform tension; massive string increases linearly from load to pull end', () => {
    const idealVert = evaluateNewton23({
      ...createDefaultNewton23Params('string_tension'),
      stringOrientation: 'vertical_hanging',
      loadMassKg: 5.0,
      ropeMassKg: 0,
      verticalAccelMs2: 2.0,
    });
    assert.equal(idealVert.isTensionUniform, true);
    const expectedIdeal = 5.0 * (GRAVITY_G + 2.0);
    assert.ok(Math.abs(idealVert.tensionBottomN - expectedIdeal) < 1e-5);
    assert.ok(Math.abs(idealVert.tensionTopN - expectedIdeal) < 1e-5);
    assert.ok(Math.abs(idealVert.tensionDeltaN) < 1e-6);

    const massiveVert = evaluateNewton23({
      ...createDefaultNewton23Params('string_tension'),
      stringOrientation: 'vertical_hanging',
      loadMassKg: 5.0,
      ropeMassKg: 3.0,
      verticalAccelMs2: 0,
    });
    assert.equal(massiveVert.isTensionUniform, false);
    assert.ok(Math.abs(massiveVert.tensionBottomN - 5.0 * GRAVITY_G) < 1e-5);
    assert.ok(Math.abs(massiveVert.tensionMidN - 6.5 * GRAVITY_G) < 1e-5);
    assert.ok(Math.abs(massiveVert.tensionTopN - 8.0 * GRAVITY_G) < 1e-5);
    assert.ok(massiveVert.tensionTopN > massiveVert.tensionBottomN);

    const massiveHoriz = evaluateNewton23({
      ...createDefaultNewton23Params('string_tension'),
      stringOrientation: 'horizontal_pull',
      loadMassKg: 6.0,
      ropeMassKg: 4.0,
      horizontalPullN: 50,
    });
    assert.ok(Math.abs(massiveHoriz.ropeAccelMs2 - 5.0) < 1e-6);
    assert.ok(Math.abs(massiveHoriz.tensionBottomN - 30.0) < 1e-6);
    assert.ok(Math.abs(massiveHoriz.tensionTopN - 50.0) < 1e-6);
  });

  await t.test('2.3.A.3.iv: Ideal pulley gives T_A = T_B; non-ideal pulley produces T_B > T_A satisfying rotational torque', () => {
    const idealAtwood = evaluateNewton23({
      ...createDefaultNewton23Params('ideal_pulley'),
      pulleyPreset: 'atwood',
      pulleyMassA: 3.0,
      pulleyMassB: 5.0,
      isIdealPulley: true,
    });
    const expA = ((5.0 - 3.0) * GRAVITY_G) / 8.0;
    const expT = (2 * 3.0 * 5.0 * GRAVITY_G) / 8.0;
    assert.ok(Math.abs(idealAtwood.pulleyAccelMs2 - expA) < 1e-5);
    assert.ok(Math.abs(idealAtwood.pulleyTensionAN - expT) < 1e-5);
    assert.ok(Math.abs(idealAtwood.pulleyTensionBN - expT) < 1e-5);
    assert.equal(idealAtwood.isTensionUniform, true);

    const realAtwood = evaluateNewton23({
      ...createDefaultNewton23Params('ideal_pulley'),
      pulleyPreset: 'atwood',
      pulleyMassA: 3.0,
      pulleyMassB: 5.0,
      isIdealPulley: false,
      pulleyWheelMassKg: 4.0,
      pulleyFrictionTorqueNm: 0.5,
      pulleyRadiusM: 0.25,
    });
    assert.equal(realAtwood.isTensionUniform, false);
    assert.ok(realAtwood.pulleyTensionBN > realAtwood.pulleyTensionAN);
    // Rotational torque balance: (T_B - T_A)*R - tau_f === 0.5 * m_p * R * a
    const lhs = (realAtwood.pulleyTensionBN - realAtwood.pulleyTensionAN) * 0.25 - 0.5;
    const rhs = 0.5 * 4.0 * 0.25 * realAtwood.pulleyAccelMs2;
    assert.ok(Math.abs(lhs - rhs) < 1e-5);
  });

  await t.test('1.A / 2.C / 3.B / 3.C: Diagrams stay within SVG bounds, claims complete, zero combining-arrow glyphs', () => {
    const modes = ['action_reaction', 'internal_com', 'string_tension', 'ideal_pulley'] as const;
    for (const m of modes) {
      const ev = evaluateNewton23(createDefaultNewton23Params(m));
      const { width, height, boxes, tensionCurve } = ev.diagramLayout;
      for (const box of boxes) {
        for (const a of box.arrows) {
          assert.ok(a.labelX >= 0 && a.labelX <= width);
          assert.ok(a.labelY >= 0 && a.labelY <= height);
        }
      }
      if (tensionCurve) {
        for (const p of tensionCurve) {
          assert.ok(p.x >= 0 && p.x <= width);
          assert.ok(p.y >= 0 && p.y <= height);
        }
      }
      assert.ok(ev.equations.length >= 3);
      assert.ok(ev.justificationSteps.length >= 2);
      assert.ok(ev.comparisonRows.length >= 3);
      const serialized = JSON.stringify(ev);
      assert.equal(serialized.includes('\u20D7'), false);
    }
    assert.equal(TOPIC_23_CLAIM_QUESTIONS.length, 4);
  });
});
