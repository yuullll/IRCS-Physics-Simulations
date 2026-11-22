import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EPSILON_0,
  COULOMB_K,
  createDefaultGauss86Params,
  evaluateGauss86,
  buildGauss86GraphLayout,
  getGaussDerivationSteps86,
  predictGaussScaling86,
  GAUSS_86_CLAIM_QUESTIONS,
} from './gauss-law-8-6';

describe('Topic 8.6 Gauss’s Law', () => {
  it('8.6.A.1 & 8.6.A.3: Point charge flux equals q_enc/ε₀, is strictly invariant across radius r, and ignores external charge', () => {
    const base = createDefaultGauss86Params('point_invariance');
    base.chargeMagnitudeMicro = 5.0; // +5 μC
    const expectedFluxKN = (5.0e-6 / EPSILON_0) / 1e3;

    const radii = [0.6, 1.2, 2.4];
    const evals = radii.map(r => evaluateGauss86({ ...base, gaussianRadiusM: r }));

    for (let i = 0; i < radii.length; i++) {
      const r = radii[i];
      const ev = evals[i];
      assert.ok(Math.abs(ev.fluxFromGaussKNm2C - expectedFluxKN) < 1e-6);
      assert.ok(Math.abs(ev.fluxFromIntegralKNm2C - expectedFluxKN) < 1e-6);
      // E must match Coulomb's law kQ/r² (in kN/C)
      const expectedE = (COULOMB_K * 5.0e-6) / (r * r) / 1e3;
      assert.ok(Math.abs(ev.fieldMagKNPerC - expectedE) < 1e-5);
    }

    // Doubling radius r -> 2r quarters E while flux stays identical
    assert.ok(Math.abs(evals[1].fieldMagKNPerC / evals[0].fieldMagKNPerC - 0.25) < 1e-6);
    assert.ok(Math.abs(evals[1].fluxFromGaussKNm2C - evals[0].fluxFromGaussKNm2C) < 1e-9);

    // Adding an external charge does not change net enclosed flux
    const withExt = evaluateGauss86({ ...base, gaussianRadiusM: 1.2, externalChargeMicro: -8.0 });
    assert.ok(Math.abs(withExt.fluxFromGaussKNm2C - expectedFluxKN) < 1e-6);
    assert.equal(withExt.regions.length, 2);
    assert.equal(withExt.regions[1].fluxKNm2PerC, 0);
  });

  it('8.6.A.4 & 8.6.A.5: Spherical symmetry volume integrals match uniform, linear ρ=αr, inverse ρ=β/r, and conducting shell', () => {
    const R = 1.2;
    const Q = 8.0; // μC
    const rIn = 0.6; // r = R/2

    // Uniform solid: q_enc = Q(1/2)^3 = Q/8, E(R/2) = 1/2 E(R)
    const uIn = evaluateGauss86({
      ...createDefaultGauss86Params('spherical'),
      sphericalProfile: 'uniform_solid',
      chargeMagnitudeMicro: Q,
      bodyRadiusM: R,
      gaussianRadiusM: rIn,
    });
    const uEdge = evaluateGauss86({
      ...createDefaultGauss86Params('spherical'),
      sphericalProfile: 'uniform_solid',
      chargeMagnitudeMicro: Q,
      bodyRadiusM: R,
      gaussianRadiusM: R,
    });
    assert.ok(Math.abs(uIn.qEncMicro - Q / 8) < 1e-9);
    assert.ok(Math.abs(uIn.fieldMagKNPerC / uEdge.fieldMagKNPerC - 0.5) < 1e-6);

    // Linear ρ = αr: q_enc = Q(1/2)^4 = Q/16, E(R/2) = 1/4 E(R)
    const lIn = evaluateGauss86({
      ...createDefaultGauss86Params('spherical'),
      sphericalProfile: 'linear_rho',
      chargeMagnitudeMicro: Q,
      bodyRadiusM: R,
      gaussianRadiusM: rIn,
    });
    assert.ok(Math.abs(lIn.qEncMicro - Q / 16) < 1e-9);
    assert.ok(Math.abs(lIn.fieldMagKNPerC / uEdge.fieldMagKNPerC - 0.25) < 1e-6);

    // Inverse ρ = β/r: q_enc = Q(1/2)^2 = Q/4, E(R/2) === E(R) (constant inside!)
    const invIn = evaluateGauss86({
      ...createDefaultGauss86Params('spherical'),
      sphericalProfile: 'inverse_rho',
      chargeMagnitudeMicro: Q,
      bodyRadiusM: R,
      gaussianRadiusM: rIn,
    });
    assert.ok(Math.abs(invIn.qEncMicro - Q / 4) < 1e-9);
    assert.ok(Math.abs(invIn.fieldMagKNPerC - uEdge.fieldMagKNPerC) < 1e-6);

    // Conducting shell: q_enc = 0 and E = 0 inside; E = kQ/r^2 outside
    const condIn = evaluateGauss86({
      ...createDefaultGauss86Params('spherical'),
      sphericalProfile: 'conducting_shell',
      chargeMagnitudeMicro: Q,
      bodyRadiusM: R,
      gaussianRadiusM: rIn,
    });
    assert.equal(condIn.qEncMicro, 0);
    assert.equal(condIn.fieldMagKNPerC, 0);
    assert.equal(condIn.fluxSign, 'zero');
  });

  it('8.6.A.4 & 8.6.A.5: Cylindrical symmetry enforces zero cap flux, 1/r outside decay, and exact interior integrals', () => {
    const base = createDefaultGauss86Params('cylindrical');
    base.chargeMagnitudeMicro = 4.0; // λ = 4 μC/m
    base.bodyRadiusM = 1.0;
    base.gaussianLengthM = 2.5;

    // Outside line charge: E = λ / (2πε₀r)
    const lineR1 = evaluateGauss86({ ...base, cylindricalProfile: 'line_charge', gaussianRadiusM: 1.0 });
    const lineR2 = evaluateGauss86({ ...base, cylindricalProfile: 'line_charge', gaussianRadiusM: 2.0 });
    const expectedE1 = (4.0e-6 / (2 * Math.PI * EPSILON_0 * 1.0)) / 1e3;
    assert.ok(Math.abs(lineR1.fieldMagKNPerC - expectedE1) < 1e-5);
    // 1/r scaling: doubling r halves E while flux stays constant
    assert.ok(Math.abs(lineR2.fieldMagKNPerC / lineR1.fieldMagKNPerC - 0.5) < 1e-6);
    assert.ok(Math.abs(lineR2.fluxFromGaussKNm2C - lineR1.fluxFromGaussKNm2C) < 1e-9);
    // Caps must have zero flux
    const caps = lineR1.regions.find(rg => rg.id === 'end-caps');
    assert.ok(caps && caps.fluxKNm2PerC === 0 && caps.relation === 'perpendicular');

    // Interior linear cylinder ρ=αr: q_enc = λL (r/R)^3
    const linCyl = evaluateGauss86({
      ...base,
      cylindricalProfile: 'linear_cylinder',
      gaussianRadiusM: 0.5,
    });
    assert.ok(Math.abs(linCyl.qEncMicro - 4.0 * 2.5 * 0.125) < 1e-9);
    assert.ok(Math.abs(linCyl.fieldMagKNPerC / lineR1.fieldMagKNPerC - 0.25) < 1e-6);
  });

  it('8.6.A.4 & 8.6.A.5: Planar symmetry pillbox yields σ/(2ε₀) for sheet, linear interior for thick slab, and σ/ε₀ for conductor', () => {
    const base = createDefaultGauss86Params('planar');
    base.chargeMagnitudeMicro = 3.0; // σ = 3 μC/m²
    base.bodyRadiusM = 0.8; // half-thickness d
    base.pillboxAreaM2 = 2.0;

    // Nonconducting sheet: E = σ / (2ε₀), completely independent of distance x
    const sheetNear = evaluateGauss86({ ...base, planarProfile: 'nonconducting_sheet', gaussianRadiusM: 0.4 });
    const sheetFar = evaluateGauss86({ ...base, planarProfile: 'nonconducting_sheet', gaussianRadiusM: 2.0 });
    const expectedSheetE = (3.0e-6 / (2 * EPSILON_0)) / 1e3;
    assert.ok(Math.abs(sheetNear.fieldMagKNPerC - expectedSheetE) < 1e-5);
    assert.ok(Math.abs(sheetFar.fieldMagKNPerC - expectedSheetE) < 1e-5);
    assert.equal(sheetNear.regions.find(rg => rg.id === 'pillbox-wall')?.fluxKNm2PerC, 0);

    // Conducting plate: E = σ / ε₀ = 2 * E_sheet
    const condPlate = evaluateGauss86({ ...base, planarProfile: 'conducting_plate', gaussianRadiusM: 1.0 });
    assert.ok(Math.abs(condPlate.fieldMagKNPerC - 2 * expectedSheetE) < 1e-5);
    assert.equal(condPlate.regions.find(rg => rg.id === 'inner-cap')?.fluxKNm2PerC, 0);

    // Thick slab: at x = d/2, E is half of exterior value
    const slabIn = evaluateGauss86({ ...base, planarProfile: 'thick_slab', gaussianRadiusM: 0.4 });
    const slabOut = evaluateGauss86({ ...base, planarProfile: 'thick_slab', gaussianRadiusM: 1.2 });
    assert.ok(Math.abs(slabIn.fieldMagKNPerC / slabOut.fieldMagKNPerC - 0.5) < 1e-6);
  });

  it('1.A / 2.A / 2.D: SVG graph layouts stay bounded, scaling predictions match ratios, and derivations/claims are complete', () => {
    const symmetries = ['point_invariance', 'spherical', 'cylindrical', 'planar'] as const;
    for (const sym of symmetries) {
      const p = createDefaultGauss86Params(sym);
      const ev = evaluateGauss86(p);
      const layout = buildGauss86GraphLayout(p, 304, 148);

      assert.ok(layout.fieldPath.startsWith('M '));
      assert.ok(layout.qEncPath.startsWith('M '));
      assert.ok(layout.markerX >= 36 && layout.markerX <= 304 - 14);
      assert.ok(layout.markerFieldY >= 16 && layout.markerFieldY <= 148 - 26);

      const steps = getGaussDerivationSteps86(p, ev);
      assert.equal(steps.length, 4);
      // Ensure zero combining arrow Unicode characters that cause tofu boxes
      for (const st of steps) {
        assert.equal(/[\u20d0-\u20ff]/.test(st.symbolic), false);
      }

      const scale2 = predictGaussScaling86(p, 2);
      assert.equal(scale2.factor, 2);
      assert.ok(scale2.summary.length > 20);
    }

    // Verify Skill 2.D prediction matches exact ratio inside uniform sphere
    const sphIn = { ...createDefaultGauss86Params('spherical'), gaussianRadiusM: 0.4, bodyRadiusM: 1.2 };
    const pred = predictGaussScaling86(sphIn, 2);
    const ev1 = evaluateGauss86(sphIn);
    const ev2 = evaluateGauss86({ ...sphIn, gaussianRadiusM: 0.8 });
    assert.ok(Math.abs(ev2.qEncMicro / ev1.qEncMicro - pred.qEncFactor) < 1e-6);
    assert.ok(Math.abs(ev2.fieldMagKNPerC / ev1.fieldMagKNPerC - pred.fieldFactor) < 1e-6);

    assert.equal(GAUSS_86_CLAIM_QUESTIONS.length, 4);
  });
});
