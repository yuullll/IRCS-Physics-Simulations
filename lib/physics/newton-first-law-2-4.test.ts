import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY_G,
  TOPIC_24_CLAIM_QUESTIONS,
  computeEquilibrantForce,
  createDefaultNewton24Params,
  evaluateNewton24,
  solveHangingSignTensions,
} from './newton-first-law-2-4';

test('Topic 2.4 Newton’s First Law', async t => {
  await t.test(
    '2.4.A.1 & 2.4.A.2: Vector sum ΣF_i = 0 achieved exactly by computed equilibrant & hanging sign tensions',
    () => {
      const eq = computeEquilibrantForce(30, 0, 40, 90);
      assert.ok(Math.abs(eq.mag - 50) < 1e-6, `Expected 50 N equilibrant, got ${eq.mag}`);
      assert.ok(eq.angleDeg > 180 && eq.angleDeg < 270, 'Equilibrant must point into Q3');

      const params = {
        ...createDefaultNewton24Params('equilibrium'),
        eqPreset: 'force_table' as const,
        f1MagN: 30,
        f1AngleDeg: 0,
        f2MagN: 40,
        f2AngleDeg: 90,
        f3MagN: eq.mag,
        f3AngleDeg: eq.angleDeg,
      };
      const res = evaluateNewton24(params);
      assert.equal(res.isEquilibrium, true);
      assert.ok(res.fNetMag < 1e-4, `Expected ΣF = 0, got ${res.fNetMag}`);
      assert.equal(res.auditStatus, 'VERIFIED');

      // Hanging sign static equilibrium: steeper cable carries greater tension and vector sum vanishes
      const sign = solveHangingSignTensions(5.0, 30, 60);
      assert.ok(sign.tRight > sign.tLeft, 'Steeper 60° right cable must bear larger tension');
      const signRes = evaluateNewton24({
        ...createDefaultNewton24Params('equilibrium'),
        eqPreset: 'hanging_sign',
        signMassKg: 5.0,
        leftCableAngleDeg: 30,
        rightCableAngleDeg: 60,
      });
      assert.ok(signRes.fNetMag < 1e-6, `Hanging sign ΣF must vanish, got ${signRes.fNetMag}`);
      assert.ok(
        Math.abs(sign.tLeft * Math.sin((30 * Math.PI) / 180) + sign.tRight * Math.sin((60 * Math.PI) / 180) - 5.0 * GRAVITY_G) < 1e-6
      );
    }
  );

  await t.test(
    '2.4.A.3: Balanced nonzero opposing forces keep nonzero velocity strictly constant over time',
    () => {
      const params = {
        ...createDefaultNewton24Params('constant_v'),
        gliderMassKg: 4.0,
        gliderV0Ms: 5.0,
        thrustForceN: 25,
        opposeForceN: 25,
        simTimeS: 3.5,
      };
      const res = evaluateNewton24(params);
      assert.equal(res.isVxConstant, true);
      assert.equal(res.fNetX, 0);
      assert.equal(res.accelX, 0);
      assert.equal(res.vxNow, 5.0);
      assert.ok(Math.abs(res.posX - 17.5) < 1e-6);

      // Unbalancing thrust by +8 N produces a_x = +2.0 m/s^2
      const unbal = evaluateNewton24({ ...params, thrustForceN: 33 });
      assert.equal(unbal.isVxConstant, false);
      assert.ok(Math.abs(unbal.accelX - 2.0) < 1e-6);
      assert.ok(Math.abs(unbal.vxNow - 12.0) < 1e-6);
    }
  );

  await t.test(
    '2.4.A.4: Balanced X-axis keeps v_x invariant while unbalanced Y-axis accelerates only v_y',
    () => {
      const params = {
        ...createDefaultNewton24Params('axis_independence'),
        puckMassKg: 4.0,
        puckVx0Ms: 3.0,
        puckVy0Ms: 0.0,
        fxPlusN: 18,
        fxMinusN: 18,
        fyPlusN: 20,
        fyMinusN: 8,
        simTimeS: 2.0,
      };
      const res = evaluateNewton24(params);
      assert.equal(res.isVxConstant, true);
      assert.equal(res.isVyConstant, false);
      assert.equal(res.accelX, 0);
      assert.ok(Math.abs(res.accelY - 3.0) < 1e-6);
      assert.equal(res.vxNow, 3.0);
      assert.ok(Math.abs(res.vyNow - 6.0) < 1e-6);

      // Verify strobe X spacing is strictly uniform while Y spacing increases
      assert.ok(res.strobePoints.length >= 6);
      const dx1 = res.strobePoints[1].x - res.strobePoints[0].x;
      const dx4 = res.strobePoints[4].x - res.strobePoints[3].x;
      const dy1 = res.strobePoints[1].y - res.strobePoints[0].y;
      const dy4 = res.strobePoints[4].y - res.strobePoints[3].y;
      assert.ok(Math.abs(dx1 - dx4) < 1e-6, 'Horizontal strobe intervals must be identical');
      assert.ok(dy4 > dy1 * 3, 'Vertical strobe intervals must grow linearly with time');
    }
  );

  await t.test(
    '2.4.A.5: Constant-velocity railcar is inertial (θ=0, a_puck/car=0); accelerating railcar is non-inertial',
    () => {
      const inertial = evaluateNewton24({
        ...createDefaultNewton24Params('inertial_frame'),
        observerFrame: 'railcar',
        railcarV0Ms: 7.5,
        railcarAccelMs2: 0,
        simTimeS: 2.0,
      });
      assert.equal(inertial.isFrameInertial, true);
      assert.equal(inertial.auditStatus, 'VERIFIED');
      assert.equal(inertial.puckCarAx, 0);
      assert.equal(inertial.plumbTiltDeg, 0);

      const nonInertial = evaluateNewton24({
        ...createDefaultNewton24Params('inertial_frame'),
        observerFrame: 'railcar',
        railcarV0Ms: 4.0,
        railcarAccelMs2: 3.0,
        bobMassKg: 2.0,
        simTimeS: 1.5,
      });
      assert.equal(nonInertial.isFrameInertial, false);
      assert.equal(nonInertial.auditStatus, 'NON-INERTIAL');
      assert.equal(nonInertial.puckCarAx, -3.0);
      const expectedAngle = (Math.atan2(3.0, GRAVITY_G) * 180) / Math.PI;
      assert.ok(Math.abs(nonInertial.plumbTiltDeg - expectedAngle) < 1e-6);
      assert.equal(nonInertial.puckEarthVx, 4.0, 'Earth observer still verifies constant velocity');
    }
  );

  await t.test(
    '1.C / 2.B / 2.C / 3.C: SVG layouts stay bounded, claims complete, zero combining-arrow glyphs',
    () => {
      const modes = ['equilibrium', 'constant_v', 'axis_independence', 'inertial_frame'] as const;
      for (const mode of modes) {
        const res = evaluateNewton24(createDefaultNewton24Params(mode));
        assert.ok(res.calcSteps.length >= 3, `${mode} should provide >= 3 skill 2.B steps`);
        assert.ok(res.comparisonRows.length >= 4, `${mode} should provide >= 4 skill 2.C rows`);
        assert.ok(res.graphLayout.width > 0 && res.graphLayout.height > 0);
        const serialized = JSON.stringify(res);
        assert.equal(
          serialized.includes('\u20D7'),
          false,
          `${mode} must not contain combining arrow unicode glyphs`
        );
      }
      assert.equal(TOPIC_24_CLAIM_QUESTIONS.length, 4);
      for (const q of TOPIC_24_CLAIM_QUESTIONS) {
        assert.equal(q.options.filter(o => o.isCorrect).length, 1);
      }
    }
  );
});
