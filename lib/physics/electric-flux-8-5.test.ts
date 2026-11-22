import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPIC_8_5_CLAIMS,
  computeFluxGraphLayout,
  createDefaultFlux85Params,
  evaluateFlux85,
  getFluxDerivationSteps85,
} from './electric-flux-8-5';

describe('Topic 8.5 Electric Flux', () => {
  it('8.5.A.2 & 8.5.A.2.i-ii: Uniform open surface satisfies Φ = EA cos θ across 0°, 60°, 90°, 120°, 180°', () => {
    const base = createDefaultFlux85Params('uniform_open');
    base.fieldStrength = 8.0;
    base.areaM2 = 2.5; // E*A = 20

    const ev0 = evaluateFlux85({ ...base, angleDeg: 0 });
    assert.ok(Math.abs(ev0.exactFlux - 20) < 1e-6);
    assert.equal(ev0.fluxSign, 'positive');
    assert.ok(Math.abs(ev0.projectedAreaM2 - 2.5) < 1e-6);

    const ev60 = evaluateFlux85({ ...base, angleDeg: 60 });
    assert.ok(Math.abs(ev60.exactFlux - 10) < 1e-5);
    assert.equal(ev60.fluxSign, 'positive');

    const ev90 = evaluateFlux85({ ...base, angleDeg: 90 });
    assert.equal(ev90.exactFlux, 0);
    assert.equal(ev90.fluxSign, 'zero');
    assert.ok(ev90.projectedAreaM2 < 1e-5);

    const ev120 = evaluateFlux85({ ...base, angleDeg: 120 });
    assert.ok(Math.abs(ev120.exactFlux + 10) < 1e-5);
    assert.equal(ev120.fluxSign, 'negative');

    const ev180 = evaluateFlux85({ ...base, angleDeg: 180 });
    assert.ok(Math.abs(ev180.exactFlux + 20) < 1e-5);
    assert.equal(ev180.fluxSign, 'negative');
  });

  it('8.5.A.3: Nonuniform surface integrals match closed-form calculus and discrete N×N grid converges', () => {
    const base = createDefaultFlux85Params('nonuniform_integral');
    base.areaM2 = 4.0; // H = W = 2.0 m
    base.fieldStrength = 3.0;
    base.gradientBeta = 4.0;

    // Linear: W * (E0*H + 0.5*beta*H^2) = 2 * (6 + 8) = 28
    const evLin = evaluateFlux85({ ...base, nonuniformProfile: 'linear_y', gridN: 6 });
    assert.ok(Math.abs(evLin.exactFlux - 28) < 1e-5);
    assert.ok(Math.abs(evLin.discreteFlux - 28) < 1e-5, 'Midpoint rule is exact for linear profiles');

    // Quadratic: (1/3)*beta*W*H^3 = (1/3)*4*2*8 = 64/3 ≈ 21.3333
    const evQuadCoarse = evaluateFlux85({ ...base, nonuniformProfile: 'quadratic_y', gridN: 2 });
    const evQuadFine = evaluateFlux85({ ...base, nonuniformProfile: 'quadratic_y', gridN: 12 });
    assert.ok(Math.abs(evQuadFine.exactFlux - 64 / 3) < 1e-5);
    assert.ok(
      evQuadFine.errorPercent < evQuadCoarse.errorPercent,
      `Fine grid (${evQuadFine.errorPercent}%) should have smaller error than coarse (${evQuadCoarse.errorPercent}%)`
    );
    assert.ok(evQuadFine.errorPercent < 0.5);

    // Sine: (2/pi)*E0*W*H = (2/pi)*3*4 = 24/pi
    const evSinFine = evaluateFlux85({ ...base, nonuniformProfile: 'sine_y', gridN: 12 });
    assert.ok(Math.abs(evSinFine.exactFlux - 24 / Math.PI) < 1e-5);
    assert.ok(evSinFine.errorPercent < 0.5);
  });

  it('8.5.A.2.i-ii & 8.5.A.3: Closed cube has zero net flux in uniform field (even rotated) and βs³ in linear gradient', () => {
    const base = createDefaultFlux85Params('closed_cube');
    base.cubeSide = 2.0; // face area = 4, volume = 8
    base.fieldStrength = 5.0;

    // Uniform field at 0 deg and rotated 37 deg -> net flux must remain 0
    const evUnif0 = evaluateFlux85({ ...base, cubeFieldMode: 'uniform', angleDeg: 0 });
    assert.equal(evUnif0.exactFlux, 0);
    assert.equal(evUnif0.discreteFlux, 0);
    const rightFace = evUnif0.faces.find(f => f.id === 'right')!;
    const leftFace = evUnif0.faces.find(f => f.id === 'left')!;
    assert.ok(Math.abs(rightFace.fluxKNm2C - 20) < 1e-5);
    assert.ok(Math.abs(leftFace.fluxKNm2C + 20) < 1e-5);

    const evUnifRot = evaluateFlux85({ ...base, cubeFieldMode: 'uniform', angleDeg: 37 });
    assert.equal(evUnifRot.exactFlux, 0);
    assert.ok(Math.abs(evUnifRot.discreteFlux) < 1e-4);

    // Linear gradient E(x) = E0 + beta*x -> net flux = beta * s^3 = 3 * 8 = 24 (even when rotated!)
    const evGradRot = evaluateFlux85({
      ...base,
      cubeFieldMode: 'linear_x',
      gradientBeta: 3.0,
      angleDeg: 28,
    });
    assert.ok(Math.abs(evGradRot.exactFlux - 24) < 1e-5);
    assert.ok(Math.abs(evGradRot.discreteFlux - 24) < 1e-4);
    assert.equal(evGradRot.fluxSign, 'positive');
  });

  it('8.5.A.3 & 2.C: Closed cylinder cancels in uniform field and sphere flux is strictly radius-invariant in radial 1/r² field', () => {
    const cylUnif = evaluateFlux85({
      ...createDefaultFlux85Params('closed_curved'),
      curvedType: 'cylinder',
      curvedFieldMode: 'uniform',
      fieldStrength: 6.0,
      curvedRadius: 1.5,
    });
    assert.equal(cylUnif.exactFlux, 0);
    const wall = cylUnif.faces.find(f => f.id === 'cyl-wall')!;
    assert.equal(wall.fluxKNm2C, 0);

    const sphSmall = evaluateFlux85({
      ...createDefaultFlux85Params('closed_curved'),
      curvedType: 'sphere',
      curvedFieldMode: 'radial_source',
      fieldStrength: 5.0,
      curvedRadius: 1.0,
      radialPolarity: 1,
    });
    const sphLarge = evaluateFlux85({
      ...createDefaultFlux85Params('closed_curved'),
      curvedType: 'sphere',
      curvedFieldMode: 'radial_source',
      fieldStrength: 5.0,
      curvedRadius: 2.4,
      radialPolarity: 1,
    });
    assert.ok(Math.abs(sphSmall.exactFlux - sphLarge.exactFlux) < 1e-5);
    assert.ok(Math.abs(sphSmall.exactFlux - 4 * Math.PI * 5.0) < 1e-4);

    const sphNeg = evaluateFlux85({
      ...createDefaultFlux85Params('closed_curved'),
      curvedType: 'sphere',
      curvedFieldMode: 'radial_source',
      fieldStrength: 5.0,
      curvedRadius: 1.8,
      radialPolarity: -1,
    });
    assert.ok(Math.abs(sphNeg.exactFlux + sphSmall.exactFlux) < 1e-5);
    assert.equal(sphNeg.fluxSign, 'negative');
  });

  it('1.A / 2.A / 3.B: SVG graph layouts stay bounded and derivations/claims are complete for all 4 scenarios', () => {
    const scenarios = [
      'uniform_open',
      'nonuniform_integral',
      'closed_cube',
      'closed_curved',
    ] as const;

    for (const sc of scenarios) {
      const params = createDefaultFlux85Params(sc);
      const ev = evaluateFlux85(params);
      const layout = computeFluxGraphLayout(params, ev, 316, 166);
      assert.ok(Number.isFinite(layout.zeroY) && layout.zeroY >= 10 && layout.zeroY <= 156);
      assert.ok(Number.isFinite(layout.markerX) && Number.isFinite(layout.markerY));
      if (layout.mode === 'face_bars') {
        assert.ok(layout.bars.length >= 2);
        for (const b of layout.bars) {
          assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && b.h >= 2);
        }
      } else {
        assert.ok(layout.exactPath.startsWith('M '));
        assert.ok(!layout.exactPath.includes('NaN'));
      }

      const steps = getFluxDerivationSteps85(params, ev);
      assert.equal(steps.length, 4);
      for (const st of steps) {
        assert.ok(st.symbolic.length > 4 && st.liveSubstitution.length > 4);
      }
    }

    assert.equal(TOPIC_8_5_CLAIMS.length, 4);
    for (const c of TOPIC_8_5_CLAIMS) {
      assert.ok(c.options.some(o => o.id === c.correctOptionId));
    }
  });
});
