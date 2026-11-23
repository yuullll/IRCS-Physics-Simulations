import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY_G,
  TOPIC_21_CLAIM_QUESTIONS,
  createDefaultSystems21Params,
  evaluatePlateParts,
  evaluateRodExactIntegrals,
  evaluateSystemDynamicsAt,
  evaluateSystems21,
  getDiscretePresetMasses,
} from './systems-com-2-1';

test('Topic 2.1 Systems and Center of Mass', async t => {
  await t.test(
    '2.1.B.1 & 2.1.B.2: Discrete center of mass matches Σm_i r_i / Σm_i and lies on symmetry lines',
    () => {
      const p = createDefaultSystems21Params('discrete_com');
      p.discretePreset = 'symmetric_mirror';
      p.masses = getDiscretePresetMasses('symmetric_mirror');
      const res = evaluateSystems21(p);
      assert.equal(res.totalMassKg, 8.0);
      assert.ok(Math.abs(res.xComM) < 1e-9, `Expected x_cm=0 on mirror symmetry line, got ${res.xComM}`);
      assert.equal(res.isOnSymmetryAxis, true);
      // Expected y_cm = (3*1 + 3*1 + 2*(-1.4)) / 8 = 3.2 / 8 = 0.4 m
      assert.ok(Math.abs(res.yComM - 0.4) < 1e-9);

      // Hollow ring preset places COM at origin in empty space
      const pRing = createDefaultSystems21Params('discrete_com');
      pRing.discretePreset = 'hollow_ring';
      pRing.masses = getDiscretePresetMasses('hollow_ring');
      const resRing = evaluateSystems21(pRing);
      assert.ok(Math.abs(resRing.xComM) < 1e-6);
      assert.ok(Math.abs(resRing.yComM) < 1e-6);
      assert.equal(resRing.comInsideMaterial, false);
    }
  );

  await t.test(
    '2.1.B.3 (i-ii): Nonuniform rod calculus integrals match exact closed-form & Riemann sum converges',
    () => {
      // Uniform: x_cm = L/2
      const u = evaluateRodExactIntegrals(4.0, 'uniform', 2.5, 0);
      assert.ok(Math.abs(u.totalMassKg - 10.0) < 1e-9);
      assert.ok(Math.abs(u.xComM - 2.0) < 1e-9);

      // Quadratic λ(x) = β x²: M = βL³/3, x_cm = 3L/4
      const q = evaluateRodExactIntegrals(4.0, 'quadratic', 0, 1.5);
      assert.ok(Math.abs(q.totalMassKg - (1.5 * 64) / 3) < 1e-9);
      assert.ok(Math.abs(q.xComM - 3.0) < 1e-9);

      // Linear λ(x) = 1 + 1.5x on [0, 4]: M = 4 + 12 = 16, ∫xλdx = 8 + 32 = 40, x_cm = 2.5
      const lin = evaluateRodExactIntegrals(4.0, 'linear', 1.0, 1.5);
      assert.ok(Math.abs(lin.totalMassKg - 16.0) < 1e-9);
      assert.ok(Math.abs(lin.xComM - 2.5) < 1e-9);

      // Riemann convergence & λ = dm/dx numerical derivative check
      const pCoarse = createDefaultSystems21Params('continuous_rod');
      pCoarse.rodProfile = 'quadratic';
      pCoarse.riemannSlices = 6;
      const rCoarse = evaluateSystems21(pCoarse);

      const pFine = { ...pCoarse, riemannSlices: 40 };
      const rFine = evaluateSystems21(pFine);
      assert.ok(rFine.riemannPercentError < rCoarse.riemannPercentError);
      assert.ok(rFine.riemannPercentError < 0.05);
      assert.ok(Math.abs(rFine.lambdaDerivativeCheckKgPerM - rFine.lambdaAtMidKgPerM) < 1e-3);
    }
  );

  await t.test(
    '2.1.B.1 & 2.1.B.3.ii: 2D Plate cutout shifts COM away from hole along symmetry axis & triangle centroid is at 1/3',
    () => {
      const concentric = evaluatePlateParts('disk_hole', 2.4, 2.0, 0);
      assert.ok(Math.abs(concentric.xComM) < 1e-9);
      assert.ok(Math.abs(concentric.yComM) < 1e-9);
      assert.equal(concentric.comInsideMaterial, false);

      const offsetHole = evaluatePlateParts('disk_hole', 2.4, 2.0, 0.7);
      assert.ok(offsetHole.xComM < 0, 'Hole on +x must shift COM to -x');
      assert.equal(offsetHole.yComM, 0);

      const tri = evaluatePlateParts('right_triangle', 3.0, 2.0, 0);
      assert.ok(Math.abs(tri.totalMassKg - 9.0) < 1e-9);
      assert.ok(Math.abs(tri.xComM - -0.5) < 1e-9);
      assert.ok(Math.abs(tri.yComM - -0.5) < 1e-9);
    }
  );

  await t.test(
    '2.1.A.4 & 2.1.B.4: Tossed baton & mid-flight split preserve exact parabolic COM trajectory',
    () => {
      const t = 1.1;
      const baton = evaluateSystemDynamicsAt('tossed_baton', t, 2.5, 1.5, 0, 'whole_system');
      const expectedX = -2.4 + 3.3 * t;
      const expectedY = -0.7 + 7.1 * t - 0.5 * GRAVITY_G * t * t;
      assert.ok(Math.abs(baton.comX - expectedX) < 1e-9);
      assert.ok(Math.abs(baton.comY - expectedY) < 1e-9);
      // Verify weighted average of constituent coordinates recovers COM identically
      const m1 = baton.part1.massKg;
      const m2 = baton.part2.massKg;
      const reX = (m1 * baton.part1.x + m2 * baton.part2.x) / (m1 + m2);
      const reY = (m1 * baton.part1.y + m2 * baton.part2.y) / (m1 + m2);
      assert.ok(Math.abs(reX - baton.comX) < 1e-9);
      assert.ok(Math.abs(reY - baton.comY) < 1e-9);

      // Mid-flight split after t = 0.65 s: fragments separate, COM still follows exact parabola
      const split = evaluateSystemDynamicsAt('midflight_split', 1.2, 3.0, 2.0, 0, 'whole_system');
      assert.ok(split.internalSeparationM > 1.0, 'Fragments must diverge after split');
      const sM1 = split.part1.massKg;
      const sM2 = split.part2.massKg;
      assert.ok(Math.abs((sM1 * split.part1.x + sM2 * split.part2.x) / (sM1 + sM2) - split.comX) < 1e-9);
      assert.ok(Math.abs((sM1 * split.part1.y + sM2 * split.part2.y) / (sM1 + sM2) - split.comY) < 1e-9);

      // Spring-carts: a_cm = F_ext / M regardless of internal spring oscillations
      const carts = evaluateSystemDynamicsAt('spring_carts', 1.0, 2.0, 1.5, 6.0, 'whole_system');
      const totalM = carts.part1.massKg + carts.part2.massKg; // 2 + 4 = 6 kg => a_cm = 1 m/s²
      assert.ok(Math.abs(carts.comVx - (6.0 / totalM) * 1.0) < 1e-9);
    }
  );

  await t.test(
    '1.A / 2.B / 2.C / 3.B: All 4 modes produce bounded SVG charts, complete steps, and zero combining-arrow glyphs',
    () => {
      const modes = ['discrete_com', 'continuous_rod', 'composite_2d', 'system_dynamics'] as const;
      for (const m of modes) {
        const res = evaluateSystems21(createDefaultSystems21Params(m));
        assert.ok(res.solveSteps.length >= 4);
        assert.ok(res.compareRows.length >= 3);
        assert.ok(res.chartLayout.primaryPath.startsWith('M '));
        assert.ok(res.chartLayout.markerX >= 0 && res.chartLayout.markerX <= res.chartLayout.width);
        assert.ok(res.chartLayout.markerY >= 0 && res.chartLayout.markerY <= res.chartLayout.height);
        // Ensure zero combining arrow \u20d7 (prevents tofu glyphs in monospace fonts)
        const serialized = JSON.stringify(res);
        assert.equal(serialized.includes('\u20d7'), false, `Found combining arrow in mode ${m}`);
      }
      assert.equal(TOPIC_21_CLAIM_QUESTIONS.length, 4);
      assert.equal(JSON.stringify(TOPIC_21_CLAIM_QUESTIONS).includes('\u20d7'), false);
    }
  );
});
