import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  G_GRAVITY,
  G_UNIVERSAL,
  M_EARTH,
  R_EARTH,
  DEFAULT_CIRCULAR_210_PARAMS,
  solveVerticalLoop,
  solveBankedCurve,
  solveConicalPendulum,
  solveKeplerOrbit,
  evaluateCircular210,
  buildCircularChartData210,
  buildDerivationSteps210,
  buildScalingRows210,
  getChartTabLabels210,
  SCALING_CHALLENGES_210,
  CLAIM_CARDS_210,
  Circular210Mode,
} from './circular-motion-2-10';

describe('Topic 2.10 Circular Motion — Pure Physics Engine', () => {
  it('verifies 2.10.A.1, 2.10.A.2.i, 2.10.A.3–5 for vertical loop & non-uniform motion', () => {
    const m = 2.5;
    const r = 4.0;
    const vMin = Math.sqrt(G_GRAVITY * r);

    // At top (90°) with exact v_min = sqrt(g r): F_N = 0, a_c = g, gravity alone supplies F_c
    const topCrit = solveVerticalLoop(m, r, vMin, 90, 0);
    assert.ok(Math.abs(topCrit.acMs2 - G_GRAVITY) < 1e-9);
    assert.ok(Math.abs(topCrit.normalRawN) < 1e-9);
    assert.ok(Math.abs(topCrit.normalForceN) < 1e-9);
    assert.equal(topCrit.maintainsContact, true);
    assert.equal(topCrit.isCriticalTop, true);
    assert.equal(topCrit.isUniform, true);
    assert.ok(Math.abs(topCrit.periodS - (2 * Math.PI * r) / vMin) < 1e-9);
    assert.ok(Math.abs(topCrit.periodS * topCrit.frequencyHz - 1) < 1e-12);

    // Below v_min at top -> loses contact
    const topSlow = solveVerticalLoop(m, r, vMin * 0.85, 90, 0);
    assert.equal(topSlow.maintainsContact, false);
    assert.ok(topSlow.normalRawN < 0);
    assert.equal(topSlow.normalForceN, 0);

    // At bottom (270°) -> F_N = mv²/r + mg
    const bot = solveVerticalLoop(m, r, 10, 270, 0);
    const expectedBotFn = (m * 100) / r + m * G_GRAVITY;
    assert.ok(Math.abs(bot.normalForceN - expectedBotFn) < 1e-9);
    assert.equal(bot.maintainsContact, true);

    // Non-uniform circular motion (2.10.A.3 & 2.10.A.4): a_net = sqrt(a_c² + a_t²)
    const nonUnif = solveVerticalLoop(m, r, 6, 0, 4.0);
    assert.equal(nonUnif.isUniform, false);
    assert.ok(Math.abs(nonUnif.acMs2 - 9.0) < 1e-9); // 36 / 4 = 9
    assert.ok(Math.abs(nonUnif.aNetMs2 - Math.hypot(9.0, 4.0)) < 1e-9);
    assert.ok(nonUnif.aNetAngleFromRadialDeg > 0 && nonUnif.aNetAngleFromRadialDeg < 45);
  });

  it('verifies 2.10.A.2.ii banked curve exact force balance & friction reversal', () => {
    const m = 1200;
    const r = 40;
    const betaDeg = 25;
    const mu = 0.4;
    const vIdeal = Math.sqrt(G_GRAVITY * r * Math.tan((betaDeg * Math.PI) / 180));

    // At ideal frictionless speed: f_s = 0, F_N = mg / cosβ
    const ideal = solveBankedCurve(m, r, betaDeg, mu, vIdeal);
    assert.equal(ideal.status, 'ideal_frictionless');
    assert.ok(Math.abs(ideal.frictionReqN) < 1e-6);
    assert.ok(
      Math.abs(ideal.normalForceN - (m * G_GRAVITY) / Math.cos((betaDeg * Math.PI) / 180)) <
        1e-6,
    );

    // For ANY speed, horizontal components must sum identically to mv²/r and vertical to mg
    for (const v of [5, vIdeal, 20, 32]) {
      const sol = solveBankedCurve(m, r, betaDeg, mu, v);
      assert.ok(
        Math.abs(sol.normalHorizontalN + sol.frictionHorizontalN - sol.fcN) < 1e-6,
        `Horizontal sum mismatch at v=${v}`,
      );
      assert.ok(
        Math.abs(sol.normalVerticalN + sol.frictionVerticalN - sol.fgN) < 1e-6,
        `Vertical sum mismatch at v=${v}`,
      );
    }

    // Above ideal (below vMax) -> friction points down-slope (+); above vMax -> skids outward
    const fastSafe = solveBankedCurve(m, r, betaDeg, mu, (vIdeal + ideal.vMaxMs) * 0.5);
    assert.equal(fastSafe.status, 'safe_down_slope');
    assert.ok(fastSafe.frictionReqN > 0);
    assert.equal(fastSafe.isSafe, true);

    const skid = solveBankedCurve(m, r, betaDeg, mu, ideal.vMaxMs * 1.15);
    assert.equal(skid.status, 'skidding_outward');
    assert.equal(skid.isSafe, false);

    // Below ideal -> friction points up-slope (-)
    const slowSafe = solveBankedCurve(m, r, betaDeg, mu, vIdeal * 0.5);
    assert.ok(slowSafe.frictionReqN < 0);

    // Flat curve (β = 0): v_ideal = 0, v_max = sqrt(mu * g * r)
    const flat = solveBankedCurve(m, r, 0, mu, 10);
    assert.ok(Math.abs(flat.vIdealMs) < 1e-9);
    assert.ok(Math.abs(flat.vMaxMs - Math.sqrt(mu * G_GRAVITY * r)) < 1e-9);
  });

  it('verifies 2.10.A.2.iii conical pendulum tension components & mass invariance', () => {
    const L = 2.5;
    const phiDeg = 45;
    const c1 = solveConicalPendulum(1.0, L, phiDeg);
    const c2 = solveConicalPendulum(4.0, L, phiDeg);

    // At 45°, tan(45°) = 1 so a_c === g
    assert.ok(Math.abs(c1.acMs2 - G_GRAVITY) < 1e-9);
    // Vertical equilibrium T cosφ = mg
    assert.ok(Math.abs(c1.tensionVerticalN - c1.fgN) < 1e-9);
    // Horizontal centripetal T sinφ = m v² / r
    assert.ok(
      Math.abs(c1.tensionRadialN - (c1.massKg * c1.speedMs * c1.speedMs) / c1.radiusM) < 1e-9,
    );
    // Period identity: 2π r / v === 2π sqrt(L cosφ / g)
    assert.ok(Math.abs(c1.periodS - (2 * Math.PI * c1.radiusM) / c1.speedMs) < 1e-9);

    // Mass invariance: 4x mass leaves v, a_c, T identical while quadrupling tension
    assert.ok(Math.abs(c1.speedMs - c2.speedMs) < 1e-12);
    assert.ok(Math.abs(c1.acMs2 - c2.acMs2) < 1e-12);
    assert.ok(Math.abs(c1.periodS - c2.periodS) < 1e-12);
    assert.ok(Math.abs(c2.tensionN - 4 * c1.tensionN) < 1e-9);
  });

  it('verifies LO 2.10.B / 2.10.B.1 circular orbits & Kepler third law scaling', () => {
    const orb = solveKeplerOrbit(1.0, 2.0, 500, 4.0);
    const expectedConst = (4 * Math.PI * Math.PI) / (G_UNIVERSAL * M_EARTH);

    assert.ok(Math.abs(orb.satA.tSquaredOverRCubed - expectedConst) / expectedConst < 1e-9);
    assert.ok(Math.abs(orb.satB.tSquaredOverRCubed - expectedConst) / expectedConst < 1e-9);

    // R_B = 2 R_A => (T_B / T_A)² = 2³ = 8 => T_B / T_A = 2√2
    assert.ok(Math.abs(orb.radiusRatioBtoA - 2.0) < 1e-12);
    assert.ok(Math.abs(orb.tRatioSquared - 8.0) < 1e-9);
    assert.ok(Math.abs(orb.periodRatioBtoA - Math.sqrt(8)) < 1e-9);
    // Speed scales as 1 / sqrt(2)
    assert.ok(Math.abs(orb.speedRatioBtoA - 1 / Math.sqrt(2)) < 1e-9);

    // Geostationary check: R ≈ 6.617 R_Earth around 1 M_Earth -> T ≈ 24 hours
    const geo = solveKeplerOrbit(1.0, 42164e3 / R_EARTH, 1000, 2.0);
    assert.ok(Math.abs(geo.satA.periodHours - 23.934) < 0.05);

    // 4x central mass halves period T
    const heavy = solveKeplerOrbit(4.0, 2.0, 500, 4.0);
    assert.ok(Math.abs(heavy.satA.periodS - orb.satA.periodS * 0.5) < 1e-6);

    // Satellite mass invariance (500 kg vs 5000 kg)
    const bigSat = solveKeplerOrbit(1.0, 2.0, 5000, 4.0);
    assert.ok(Math.abs(bigSat.satA.periodS - orb.satA.periodS) < 1e-9);
    assert.ok(Math.abs(bigSat.satA.speedMs - orb.satA.speedMs) < 1e-9);
    assert.ok(Math.abs(bigSat.satA.fgN - 10 * orb.satA.fgN) < 1e-6);
  });

  it('produces valid 1.A charts, 2.A derivations, 2.D scaling rows/challenges, and 3.C claims across all 4 modes', () => {
    const modes: Circular210Mode[] = [
      'vertical_loop',
      'banked_curve',
      'conical_pendulum',
      'kepler_orbit',
    ];

    for (const mode of modes) {
      const p = { ...DEFAULT_CIRCULAR_210_PARAMS, mode };
      const ev = evaluateCircular210(p);
      assert.ok(ev.keyInsight.length > 20);

      const labels = getChartTabLabels210(mode);
      assert.equal(labels.length, 3);

      for (const tab of labels) {
        const chart = buildCircularChartData210(p, ev, tab.id);
        assert.ok(chart.curveA.length > 10);
        assert.ok(Number.isFinite(chart.currentPoint.x));
        assert.ok(Number.isFinite(chart.currentPoint.y));
        assert.ok(chart.xMax > chart.xMin);
        assert.ok(chart.yMax > chart.yMin);
      }

      const steps = buildDerivationSteps210(p, ev);
      assert.equal(steps.length, 4);

      const rows = buildScalingRows210(mode);
      assert.ok(rows.length >= 4);
    }

    assert.ok(SCALING_CHALLENGES_210.length >= 5);
    assert.ok(CLAIM_CARDS_210.length >= 6);
  });
});
