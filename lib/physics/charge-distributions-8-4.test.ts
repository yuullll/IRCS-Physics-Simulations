import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPIC_8_4_CLAIMS,
  computeDistributionGraphLayout,
  createDefaultDistribution84Params,
  evaluateDistribution84,
  evaluateExactCalculusFieldKN,
  getDerivationSteps84,
} from './charge-distributions-8-4';

describe('Topic 8.4 Electric Fields of Charge Distributions', () => {
  it('8.4.A.1 & 8.4.A.2: Thin ring vanishes at center, peaks at x = R/√2, cancels transverse components, and matches Riemann sum', () => {
    const base = createDefaultDistribution84Params('thin_ring');
    const center = evaluateDistribution84({ ...base, probeDistance: 0 });
    assert.equal(center.exactE.x, 0);
    assert.ok(center.riemannMag < 1e-6, 'Discrete symmetric ring sum must vanish at origin');

    // Verify peak at x = R / sqrt(2)
    const xPeak = base.radius / Math.SQRT2;
    const atPeak = evaluateExactCalculusFieldKN({ ...base, probeDistance: xPeak });
    const leftOfPeak = evaluateExactCalculusFieldKN({ ...base, probeDistance: xPeak * 0.85 });
    const rightOfPeak = evaluateExactCalculusFieldKN({ ...base, probeDistance: xPeak * 1.15 });
    assert.ok(Math.abs(atPeak.exactE.x) > Math.abs(leftOfPeak.exactE.x));
    assert.ok(Math.abs(atPeak.exactE.x) > Math.abs(rightOfPeak.exactE.x));

    // Symmetry twin cancellation & Riemann accuracy
    const ev = evaluateDistribution84({ ...base, probeDistance: xPeak, segmentsN: 32 });
    assert.ok(ev.symmetry.hasSymmetryTwin);
    assert.ok(ev.symmetry.cancellationResidual < 1e-9, 'Opposite ring elements cancel transverse dE');
    assert.ok(ev.riemannErrorPercent < 0.05, 'Ring Riemann sum converges tightly to exact integral');
  });

  it('8.4.A.1 & 8.4.A.2: Semicircular arc matches 2kλ/R, full 360° circle cancels to 0, and N increase reduces Riemann error', () => {
    const base = createDefaultDistribution84Params('arc_center');
    const semiCoarse = evaluateDistribution84({ ...base, arcAngleDeg: 180, segmentsN: 6 });
    const semiFine = evaluateDistribution84({ ...base, arcAngleDeg: 180, segmentsN: 48 });
    assert.ok(semiFine.riemannErrorPercent < semiCoarse.riemannErrorPercent);
    assert.ok(semiFine.riemannErrorPercent < 0.1);
    assert.ok(semiFine.symmetry.cancellationResidual < 1e-9);

    // Full 360° circle cancels identically to zero
    const fullCircle = evaluateDistribution84({ ...base, arcAngleDeg: 360, segmentsN: 32 });
    assert.equal(fullCircle.exactE.x, 0);
    assert.ok(fullCircle.riemannMag < 1e-6);
  });

  it('8.4.A.1 & 2.C: Finite line (bisector) converges to infinite wire as L ≫ x and point charge as x ≫ L', () => {
    const base = createDefaultDistribution84Params('finite_line_bisector');
    const ev = evaluateDistribution84({ ...base, length: 3.0, probeDistance: 1.5, segmentsN: 48 });
    assert.ok(ev.symmetry.cancellationResidual < 1e-9);
    assert.ok(ev.riemannErrorPercent < 0.15);

    // Far-field limit x >> L approaches point charge (ratio -> 1)
    const far = evaluateDistribution84({ ...base, length: 1.0, probeDistance: 20.0 });
    assert.ok(Math.abs(far.ratioToPointCharge - 1) < 0.005);

    // Very long rod approaches infinite wire formula 2kλ/x
    const veryLong = evaluateExactCalculusFieldKN({
      ...base,
      chargeMicro: 100, // Q = 100 μC over L = 50 m => λ = 2 μC/m
      length: 50,
      probeDistance: 1.0,
    });
    const infWire = evaluateExactCalculusFieldKN({
      ...createDefaultDistribution84Params('infinite_wire'),
      chargeMicro: 2.0, // λ = 2 μC/m
      probeDistance: 1.0,
    });
    const relDiff = Math.abs(veryLong.exactE.x - infWire.exactE.x) / Math.abs(infWire.exactE.x);
    assert.ok(relDiff < 0.002, 'Long finite line bisector matches infinite wire');
  });

  it('8.4.A.1 & 2.C: Finite line (collinear) satisfies kQ/[a(a+L)] and exceeds center point-charge field', () => {
    const base = createDefaultDistribution84Params('finite_line_collinear');
    const ev = evaluateDistribution84({ ...base, length: 2.6, probeDistance: 1.1, segmentsN: 60 });
    assert.equal(ev.symmetry.hasSymmetryTwin, false);
    assert.ok(ev.riemannErrorPercent < 0.25);
    assert.ok(
      ev.ratioToPointCharge > 1.05,
      'Collinear field must exceed equivalent midpoint point charge because a(a+L) < (a+L/2)²'
    );
  });

  it('8.4.A.1 & 1.C: Infinite wire scales strictly as 1/r, SVG graph layout stays bounded, and derivations/claims are complete', () => {
    const wire = createDefaultDistribution84Params('infinite_wire');
    const atR = evaluateExactCalculusFieldKN({ ...wire, probeDistance: 1.2 });
    const at2R = evaluateExactCalculusFieldKN({ ...wire, probeDistance: 2.4 });
    assert.ok(Math.abs(atR.exactE.x / at2R.exactE.x - 2.0) < 1e-9, 'Infinite wire E ∝ 1/r');

    for (const dist of [
      'thin_ring',
      'arc_center',
      'finite_line_bisector',
      'finite_line_collinear',
      'infinite_wire',
    ] as const) {
      const p = createDefaultDistribution84Params(dist);
      const ev = evaluateDistribution84(p);
      const layout = computeDistributionGraphLayout(p, 320, 166);
      assert.ok(layout.markerX >= 0 && layout.markerX <= layout.width);
      assert.ok(layout.markerY >= 0 && layout.markerY <= layout.height);
      const steps = getDerivationSteps84(p, ev);
      assert.equal(steps.length, 5);
    }

    assert.ok(TOPIC_8_4_CLAIMS.length >= 4);
    for (const c of TOPIC_8_4_CLAIMS) {
      assert.ok(c.options.some(o => o.id === c.correctOptionId));
    }
  });
});
