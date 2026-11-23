import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPIC_22_CLAIM_QUESTIONS,
  auditBuilderFbd,
  createDefaultForces22Params,
  evaluateForces22,
} from './forces-fbd-2-2';

test('Topic 2.2 Forces and Free-Body Diagrams', async t => {
  await t.test(
    '2.2.B.4: Inclined plane aligned axes require only 1 trig decomposition (F_g) vs multiple in standard axes, and matches exact F_N = mg cosθ',
    () => {
      const p = createDefaultForces22Params('incline_axes');
      p.inclineAngleDeg = 30;
      p.massKg = 4.0;
      p.muFriction = 0.2;
      p.tensionUpN = 0;
      p.axisAlignment = 'aligned';

      const evAligned = evaluateForces22(p);
      const fg = evAligned.forces.find(f => f.id === 'fg');
      const fn = evAligned.forces.find(f => f.id === 'fn');
      const fric = evAligned.forces.find(f => f.id === 'fric');
      assert.ok(fg && fn && fric);

      const expectedFg = 4.0 * 9.8;
      const expectedFn = expectedFg * Math.cos((30 * Math.PI) / 180);
      assert.ok(Math.abs(fg.magnitudeN - expectedFg) < 1e-6);
      assert.ok(Math.abs(fn.magnitudeN - expectedFn) < 1e-6);
      // In aligned axes: only F_g requires trig decomposition, and net perpendicular force is 0
      assert.equal(evAligned.decomposedCountActive, 1);
      assert.equal(evAligned.decomposedCountStandard, 2); // F_N and f_k both angled in standard x-y
      assert.ok(Math.abs(evAligned.netFyPrimeN) < 1e-6);

      // Exact down-slope acceleration: a = g(sin30 - mu*cos30)
      const expectedA = 9.8 * (Math.sin((30 * Math.PI) / 180) - 0.2 * Math.cos((30 * Math.PI) / 180));
      assert.ok(Math.abs(evAligned.accelMagMps2 - expectedA) < 1e-4);

      // Switching to standard axes keeps identical physical acceleration magnitude
      const evStd = evaluateForces22({ ...p, axisAlignment: 'standard' });
      assert.ok(Math.abs(evStd.accelMagMps2 - expectedA) < 1e-4);
      assert.equal(evStd.decomposedCountActive, 2);
    }
  );

  await t.test(
    '2.2.B Boundary Statement: Collinear same-direction forces receive distinct side-by-side slot offsets and non-overlapping SVG origins',
    () => {
      const p = createDefaultForces22Params('collinear_sidebyside');
      p.collinearPreset = 'downward_push';
      p.massKg = 4.0;
      p.force1N = 25;

      const ev = evaluateForces22(p);
      assert.equal(ev.hasCollinearParallelPair, true);
      const fg = ev.forces.find(f => f.id === 'fg');
      const fpush = ev.forces.find(f => f.id === 'fpush');
      const fn = ev.forces.find(f => f.id === 'fn');
      assert.ok(fg && fpush && fn);

      // F_g and F_push both point -90 deg -> opposite non-zero side-by-side slots
      assert.equal(fg.collinearGroupSize, 2);
      assert.equal(fpush.collinearGroupSize, 2);
      assert.ok(Math.abs(fg.collinearSlotOffset - fpush.collinearSlotOffset) >= 0.99);
      // Normal force balances both downward forces exactly
      assert.ok(Math.abs(fn.magnitudeN - (fg.magnitudeN + fpush.magnitudeN)) < 1e-6);
      assert.ok(Math.abs(ev.netForceMagN) < 1e-6);

      // Verify SVG arrows for F_g and F_push have distinct X coordinates (side-by-side, not overlapping!)
      const arrFg = ev.diagramLayout.arrows.find(a => a.id === 'fg');
      const arrPush = ev.diagramLayout.arrows.find(a => a.id === 'fpush');
      assert.ok(arrFg && arrPush);
      assert.ok(Math.abs(arrFg.x1 - arrPush.x1) >= 8, 'Downward collinear arrows must be laterally separated');
    }
  );

  await t.test(
    '2.2.A.1.i–ii: Coupled blocks system (A+B) omits internal contact force F_A↔B while isolated Block A and Block B FBDs include it with identical acceleration',
    () => {
      const base = createDefaultForces22Params('interaction_system');
      base.massAKg = 4.0;
      base.massBKg = 2.0;
      base.appliedPushN = 36;
      base.muFriction = 0.2;

      const evWhole = evaluateForces22({ ...base, systemSelection: 'whole_ab' });
      const evA = evaluateForces22({ ...base, systemSelection: 'block_a' });
      const evB = evaluateForces22({ ...base, systemSelection: 'block_b' });

      // All three system choices produce the exact same acceleration
      assert.ok(Math.abs(evWhole.accelMagMps2 - evA.accelMagMps2) < 1e-5);
      assert.ok(Math.abs(evWhole.accelMagMps2 - evB.accelMagMps2) < 1e-5);

      // System (A+B) FBD must NOT contain internal contact force F_B->A or F_A->B
      assert.equal(evWhole.forces.some(f => f.id === 'f_ba' || f.id === 'f_ab_push'), false);
      // Block A FBD MUST contain external F_B->A; Block B FBD MUST contain external F_A->B of equal magnitude
      const fBA = evA.forces.find(f => f.id === 'f_ba');
      const fAB = evB.forces.find(f => f.id === 'f_ab_push');
      assert.ok(fBA && fAB);
      assert.ok(Math.abs(fBA.magnitudeN - fAB.magnitudeN) < 1e-6);
      assert.ok(fBA.magnitudeN > 1.0);
    }
  );

  await t.test(
    'AP FBD Builder Audit: Rejects illegal component (mg sinθ) and velocity traps, and passes only exact external force set',
    () => {
      // Including a component trap fails audit
      const badAudit = auditBuilderFbd('rough_incline_slide', ['fg', 'fn', 'fk', 'trap_mgsin']);
      assert.equal(badAudit.passed, false);
      assert.equal(badAudit.illegalSelections.length, 1);
      assert.equal(badAudit.illegalSelections[0].symbol, 'mg sinθ');

      // Missing friction fails audit
      const incomplete = auditBuilderFbd('rough_incline_slide', ['fg', 'fn']);
      assert.equal(incomplete.passed, false);
      assert.deepEqual(incomplete.missingSymbols, ['f_k']);

      // Exact required set passes
      const goodAudit = auditBuilderFbd('rough_incline_slide', ['fg', 'fn', 'fk']);
      assert.equal(goodAudit.passed, true);
      assert.equal(goodAudit.score, 3);
      assert.equal(goodAudit.illegalSelections.length, 0);
    }
  );

  await t.test(
    '1.A / 2.C / 3.B / 3.C: All 4 modes produce bounded SVG FBD layouts, valid claim questions, and zero combining-arrow glyphs',
    () => {
      const modes = [
        'incline_axes',
        'collinear_sidebyside',
        'interaction_system',
        'fbd_builder',
      ] as const;

      for (const m of modes) {
        const p = createDefaultForces22Params(m);
        const ev = evaluateForces22(p, ['fg', 'fn', 'fk']);
        assert.ok(ev.diagramLayout.width === 310 && ev.diagramLayout.height === 200);
        for (const a of ev.diagramLayout.arrows) {
          assert.ok(a.x2 >= 16 && a.x2 <= ev.diagramLayout.width - 16);
          assert.ok(a.y2 >= 12 && a.y2 <= ev.diagramLayout.height - 12);
          assert.ok(!a.symbol.includes('\u20d7'));
        }
        assert.ok(ev.comparisonRows.length >= 3);
        assert.ok(ev.justification.claim.length > 10);
        assert.ok(!ev.hudTopTitle.includes('\u20d7'));
        assert.ok(!ev.hudTopValue.includes('\u20d7'));
      }

      assert.equal(TOPIC_22_CLAIM_QUESTIONS.length, 4);
      for (const q of TOPIC_22_CLAIM_QUESTIONS) {
        assert.ok(q.options.some(o => o.id === q.correctId));
        assert.ok(!q.prompt.includes('\u20d7'));
      }
    }
  );
});
