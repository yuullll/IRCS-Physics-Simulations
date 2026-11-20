import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_LATTICE_PROTONS,
  TOPIC_8_2_CLAIMS,
  applyGroundedInductionStep,
  computeChargeBarChartLayout,
  computeConductionEquilibrium,
  createDefaultCharging82Params,
  evaluateCharging82State,
} from './charge-conservation-8-2';

describe('Topic 8.2 Conservation of Electric Charge & Process of Charging', () => {
  it('8.2.A.1.i & 8.2.A.2.i-ii: Triboelectric friction conserves total charge and keeps lattice protons fixed', () => {
    const base = createDefaultCharging82Params('friction_tribo');
    for (const pair of ['glass_silk', 'teflon_wool', 'acrylic_fur'] as const) {
      for (const rubProgress of [0, 0.5, 1.0]) {
        const state = evaluateCharging82State({
          ...base,
          triboPair: pair,
          rubProgress,
        });
        assert.equal(state.systemInitialCharge, 0);
        assert.equal(state.systemCurrentCharge, 0);
        assert.equal(state.conservationError, 0);
        const [rod, cloth] = state.objects;
        assert.equal(rod.protons, BASE_LATTICE_PROTONS);
        assert.equal(cloth.protons, BASE_LATTICE_PROTONS);
        assert.equal(rod.netCharge + cloth.netCharge, 0);
        assert.equal(rod.protons - rod.electrons, rod.netCharge);
        assert.equal(cloth.protons - cloth.electrons, cloth.netCharge);
        if (rubProgress === 1) {
          assert.equal(Math.abs(rod.netCharge), base.maxTriboTransfer);
          if (pair === 'glass_silk') {
            assert.ok(rod.netCharge > 0, 'Glass becomes positive when rubbed with silk');
            assert.equal(state.flow.fromId, 'rod');
          } else {
            assert.ok(rod.netCharge < 0, 'Teflon/Rubber becomes negative when rubbed with wool/fur');
            assert.equal(state.flow.toId, 'rod');
          }
        }
      }
    }
  });

  it('8.2.A.1.i & Skill 2.C: Contact conduction splits charge equally for identical spheres and proportional to radius for unequal spheres', () => {
    const equalRes = computeConductionEquilibrium(6, -2, 1.0, 1.0);
    assert.equal(equalRes.totalQ, 4);
    assert.equal(equalRes.qA, 2);
    assert.equal(equalRes.qB, 2);
    assert.equal(equalRes.electronsToA, 4); // Sphere A dropped from +6 to +2 by gaining 4 electrons

    const unequalRes = computeConductionEquilibrium(9, 0, 2.0, 1.0);
    assert.equal(unequalRes.totalQ, 9);
    assert.equal(unequalRes.qA, 6);
    assert.equal(unequalRes.qB, 3);

    const state = evaluateCharging82State({
      ...createDefaultCharging82Params('conduction_contact'),
      initialQA: 9,
      initialQB: 0,
      radiusA: 2.0,
      radiusB: 1.0,
      contactPhase: 'after',
    });
    assert.equal(state.systemInitialCharge, 9);
    assert.equal(state.systemCurrentCharge, 9);
    assert.equal(state.conservationError, 0);
    assert.equal(state.objects[0].netCharge, 6);
    assert.equal(state.objects[1].netCharge, 3);
    assert.equal(state.objects[0].protons, BASE_LATTICE_PROTONS);
    assert.equal(state.objects[1].protons, BASE_LATTICE_PROTONS);
  });

  it('8.2.A.1.ii-iii: Induction polarizes neutral conductors & neutral insulators while conserving Q_sys = 0', () => {
    // Touching conductors near a negative rod: electrons pushed from A -> B, so A becomes +, B becomes -
    const touchingState = evaluateCharging82State({
      ...createDefaultCharging82Params('induction_polarization'),
      inductionTarget: 'conductor_pair',
      rodCharge: -6,
      rodProximity: 1.0,
      spheresSeparated: false,
    });
    const sphereA = touchingState.objects.find(o => o.id === 'sphereA')!;
    const sphereB = touchingState.objects.find(o => o.id === 'sphereB')!;
    assert.ok(sphereA.netCharge > 0, 'Near sphere A becomes positive near negative rod');
    assert.ok(sphereB.netCharge < 0, 'Far sphere B becomes negative near negative rod');
    assert.equal(Number((sphereA.netCharge + sphereB.netCharge).toFixed(4)), 0);
    assert.equal(touchingState.systemCurrentCharge, 0);

    // Separating locks permanent opposite charges even after rod is pulled away
    const lockedState = evaluateCharging82State({
      ...createDefaultCharging82Params('induction_polarization'),
      inductionTarget: 'conductor_pair',
      rodCharge: -6,
      rodProximity: 0,
      spheresSeparated: true,
      lockedInducedQ: sphereA.netCharge,
    });
    const lockedA = lockedState.objects.find(o => o.id === 'sphereA')!;
    const lockedB = lockedState.objects.find(o => o.id === 'sphereB')!;
    assert.equal(lockedA.netCharge, sphereA.netCharge);
    assert.equal(lockedB.netCharge, -sphereA.netCharge);
    assert.equal(lockedState.systemCurrentCharge, 0);

    // Neutral insulator polarizes with zero net charge transfer
    const insulatorState = evaluateCharging82State({
      ...createDefaultCharging82Params('induction_polarization'),
      inductionTarget: 'neutral_insulator',
      rodCharge: 6,
      rodProximity: 0.9,
    });
    const ins = insulatorState.objects.find(o => o.id === 'insulator')!;
    assert.equal(ins.netCharge, 0);
    assert.ok(Math.abs(ins.polarization) > 0.4, 'Neutral insulator must show non-zero dipole polarization');
    assert.equal(insulatorState.flow.electronsTransferred, 0);
  });

  it('8.2.A.3: Direct grounding neutralizes sphere via Earth exchange; 4-step grounded induction charges opposite to rod', () => {
    const directState = evaluateCharging82State({
      ...createDefaultCharging82Params('grounding_earth'),
      groundingMode: 'direct_ground',
      groundInitialQ: 6,
      isGrounded: true,
    });
    const sphere = directState.objects.find(o => o.id === 'sphere')!;
    const earth = directState.objects.find(o => o.id === 'earth')!;
    assert.equal(sphere.netCharge, 0);
    assert.equal(earth.netCharge, 6);
    assert.equal(directState.universeCurrentCharge, directState.universeInitialCharge);
    assert.equal(directState.flow.fromId, 'earth');
    assert.equal(directState.flow.toId, 'sphere');

    // 4-step induction with negative rod -> sphere ends permanently positive after step 4
    let params = {
      ...createDefaultCharging82Params('grounding_earth'),
      groundingMode: 'induction_ground' as const,
      groundRodCharge: -6,
    };
    params = applyGroundedInductionStep(params, 1);
    const s1 = evaluateCharging82State(params);
    assert.equal(s1.systemCurrentCharge, 0);

    params = applyGroundedInductionStep(params, 2);
    const s2 = evaluateCharging82State(params);
    assert.ok(s2.systemCurrentCharge > 0, 'Step 2 ground lets repelled electrons escape to Earth');
    assert.equal(s2.conservationError, 0);

    params = applyGroundedInductionStep(params, 3);
    const s3 = evaluateCharging82State(params);
    assert.equal(s3.isSystemIsolated, true);
    assert.equal(s3.systemCurrentCharge, s2.systemCurrentCharge);

    params = applyGroundedInductionStep(params, 4);
    const s4 = evaluateCharging82State(params);
    assert.equal(params.groundRodProximity, 0);
    assert.ok(s4.systemCurrentCharge > 0, 'Step 4 leaves sphere permanently positive after rod removed');
    assert.equal(s4.conservationError, 0);
  });

  it('Skill 1.A & 3.B/3.C: Charge bar chart layout stays in SVG bounds and all claims have valid answers', () => {
    const layout = computeChargeBarChartLayout(
      [
        { id: 'a', label: 'A', initialCharge: 6, currentCharge: 2, role: 'system' },
        { id: 'b', label: 'B', initialCharge: -2, currentCharge: 2, role: 'system' },
        { id: 'tot', label: 'Total', initialCharge: 4, currentCharge: 4, role: 'system' },
      ],
      320,
      156
    );
    for (const bar of layout.bars) {
      assert.ok(bar.initialY >= 0 && bar.initialY + bar.initialH <= layout.height);
      assert.ok(bar.currentY >= 0 && bar.currentY + bar.currentH <= layout.height);
    }
    assert.ok(TOPIC_8_2_CLAIMS.length >= 4);
    for (const claim of TOPIC_8_2_CLAIMS) {
      assert.ok(claim.options.some(o => o.id === claim.correctOptionId));
    }
  });
});
