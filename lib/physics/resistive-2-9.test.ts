import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  G_GRAVITY,
  DEFAULT_RESISTIVE_29_PARAMS,
  solveLinearDragBody,
  evaluateResistive29,
  buildResistiveChartData,
  buildDerivationSteps29,
  buildComparisonRows29,
  COMPARISON_CHALLENGES_29,
  LAB_PROCEDURES_29,
  CLAIM_CARDS_29,
} from './resistive-2-9';
import {
  PRESET_USER_IDS,
  isPresetUser,
  formatAccountDisplayName,
} from '../services/labStorage';

describe('Topic 2.9 Resistive Forces — Pure Physics Engine', () => {
  it('enforces F_r = -k*v opposing velocity and terminal velocity v_T = mg/k from rest', () => {
    const m = 2.0;
    const k = 4.0;
    const fg = m * G_GRAVITY;
    const expectedVt = fg / k;
    const expectedTau = m / k; // 0.5 s

    const s0 = solveLinearDragBody(m, k, 0, fg, 0);
    assert.ok(Math.abs(s0.velocityMs) < 1e-12);
    assert.ok(Math.abs(s0.accelMs2 - G_GRAVITY) < 1e-9);
    assert.ok(Math.abs(s0.dragForceN) < 1e-12);
    assert.ok(Math.abs(s0.tauS - expectedTau) < 1e-12);
    assert.ok(Math.abs(s0.vTerminal - expectedVt) < 1e-12);

    // At t = tau: v = v_T * (1 - e^-1), a = g * e^-1
    const sTau = solveLinearDragBody(m, k, 0, fg, expectedTau);
    const eInv = Math.exp(-1);
    assert.ok(Math.abs(sTau.velocityMs - expectedVt * (1 - eInv)) < 1e-9);
    assert.ok(Math.abs(sTau.accelMs2 - G_GRAVITY * eInv) < 1e-9);
    assert.ok(sTau.dragForceN < 0, 'Resistive force must oppose +v');
    assert.ok(Math.abs(sTau.dragForceN + k * sTau.velocityMs) < 1e-9);

    // As t >> tau: v -> v_T, F_net -> 0, a -> 0
    const sInf = solveLinearDragBody(m, k, 0, fg, expectedTau * 12);
    assert.ok(Math.abs(sInf.velocityMs - expectedVt) < 1e-4);
    assert.ok(Math.abs(sInf.netForceN) < 1e-3);
    assert.ok(Math.abs(sInf.accelMs2) < 1e-3);
    assert.equal(sInf.isAtTerminal, true);
  });

  it('matches numerical derivative a(t) = dv/dt and numerical integral s(t) = int v dt', () => {
    const m = 1.6;
    const k = 2.4;
    const v0 = 3.5;
    const fDrive = 20;
    const t = 1.25;
    const dt = 1e-5;

    const sMinus = solveLinearDragBody(m, k, v0, fDrive, t - dt);
    const sMid = solveLinearDragBody(m, k, v0, fDrive, t);
    const sPlus = solveLinearDragBody(m, k, v0, fDrive, t + dt);

    const numDvDt = (sPlus.velocityMs - sMinus.velocityMs) / (2 * dt);
    const numDsDt = (sPlus.positionM - sMinus.positionM) / (2 * dt);

    assert.ok(Math.abs(numDvDt - sMid.accelMs2) < 1e-6);
    assert.ok(Math.abs(numDsDt - sMid.velocityMs) < 1e-6);
    // ODE check: m * a(t) === F_drive - k * v(t)
    assert.ok(Math.abs(m * sMid.accelMs2 - (fDrive - k * sMid.velocityMs)) < 1e-9);
  });

  it('handles fast downward launch v0 > v_T with upward net force decelerating back to v_T', () => {
    const m = 1.5;
    const k = 1.5;
    const fg = m * G_GRAVITY;
    const vT = fg / k; // 9.81 m/s
    const v0 = 2 * vT;

    const s0 = solveLinearDragBody(m, k, v0, fg, 0);
    assert.equal(s0.regime, 'decelerating_to_vt');
    assert.ok(s0.netForceN < 0, 'Drag exceeds weight so net force must oppose motion');
    assert.ok(Math.abs(s0.accelMs2 + G_GRAVITY) < 1e-9, 'At v0 = 2*vT, initial accel must be -g');

    const sLate = solveLinearDragBody(m, k, v0, fg, 10);
    assert.ok(Math.abs(sLate.velocityMs - vT) < 1e-3);
    assert.ok(sLate.velocityMs >= vT - 1e-9);
  });

  it('computes finite stopping asymptote x_max = m*v0/k for horizontal coast', () => {
    const m = 2.0;
    const k = 1.6;
    const v0 = 12.0;
    const expectedXMax = (m * v0) / k; // 15.0 m

    const evalCoast = evaluateResistive29({
      ...DEFAULT_RESISTIVE_29_PARAMS,
      mode: 'horizontal_coast',
      massKg: m,
      dragK: k,
      v0,
      timeS: 20,
    });

    assert.equal(evalCoast.primary.vTerminal, 0);
    assert.equal(evalCoast.primary.xMaxAsymptote, expectedXMax);
    assert.ok(evalCoast.primary.positionM < expectedXMax);
    assert.ok(Math.abs(evalCoast.primary.positionM - expectedXMax) < 1e-4);
    assert.ok(evalCoast.primary.velocityMs < 1e-4);
  });

  it('handles powered_thrust terminal velocity v_T = F_drive / k', () => {
    const evalThrust = evaluateResistive29({
      ...DEFAULT_RESISTIVE_29_PARAMS,
      mode: 'powered_thrust',
      massKg: 2.5,
      dragK: 2.0,
      driveForceN: 24,
      v0: 0,
      timeS: 0,
    });
    assert.ok(Math.abs(evalThrust.primary.vTerminal - 12.0) < 1e-9);
    assert.ok(Math.abs(evalThrust.primary.initialAccelMs2 - 24 / 2.5) < 1e-9);
  });

  it('validates Skill 2.C dual_compare scaling: 2m doubles v_T & tau, while (2m, 2k) is identical', () => {
    const eval2m = evaluateResistive29({
      ...DEFAULT_RESISTIVE_29_PARAMS,
      mode: 'dual_compare',
      massKg: 1.5,
      dragK: 1.5,
      v0: 0,
      massBKg: 3.0,
      dragBK: 1.5,
      v0B: 0,
      timeS: 1.0,
    });
    assert.ok(eval2m.secondary);
    assert.ok(Math.abs(eval2m.secondary.vTerminal - 2 * eval2m.primary.vTerminal) < 1e-9);
    assert.ok(Math.abs(eval2m.secondary.tauS - 2 * eval2m.primary.tauS) < 1e-9);
    assert.ok(Math.abs(eval2m.secondary.initialAccelMs2 - eval2m.primary.initialAccelMs2) < 1e-9);

    const evalSameRatio = evaluateResistive29({
      ...DEFAULT_RESISTIVE_29_PARAMS,
      mode: 'dual_compare',
      massKg: 1.5,
      dragK: 1.5,
      v0: 0,
      massBKg: 3.0,
      dragBK: 3.0,
      v0B: 0,
      timeS: 1.5,
    });
    assert.ok(evalSameRatio.secondary);
    assert.ok(Math.abs(evalSameRatio.secondary.velocityMs - evalSameRatio.primary.velocityMs) < 1e-9);
    assert.ok(Math.abs(evalSameRatio.secondary.positionM - evalSameRatio.primary.positionM) < 1e-9);
  });

  it('produces valid Skill 1.B charts, 2.A derivation steps, 2.C comparisons, 3.A labs, and 3.C claims', () => {
    const evalNow = evaluateResistive29({ ...DEFAULT_RESISTIVE_29_PARAMS, timeS: 1.5 });
    for (const kind of ['v_vs_t', 'a_vs_t', 'x_vs_t', 'fr_vs_v'] as const) {
      const chart = buildResistiveChartData({ ...DEFAULT_RESISTIVE_29_PARAMS, timeS: 1.5 }, kind);
      assert.ok(chart.curveA.length >= 50);
      assert.ok(chart.xMax > chart.xMin);
      assert.ok(chart.yMax > chart.yMin);
      assert.ok(Number.isFinite(chart.currentA.x) && Number.isFinite(chart.currentA.y));
    }

    const steps = buildDerivationSteps29(DEFAULT_RESISTIVE_29_PARAMS, evalNow);
    assert.equal(steps.length, 5);

    const comp = buildComparisonRows29(DEFAULT_RESISTIVE_29_PARAMS, evalNow);
    assert.equal(comp.rows.length, 5);

    assert.equal(COMPARISON_CHALLENGES_29.length, 3);
    assert.equal(LAB_PROCEDURES_29.length, 2);
    assert.equal(CLAIM_CARDS_29.length, 6);
  });
});

describe('Preset Account Display Name Formatting (Demo Suffix Rule)', () => {
  it('appends (Demo) ONLY to preset teacher and student accounts, never user-added accounts', () => {
    assert.equal(PRESET_USER_IDS.size, 4);
    assert.equal(isPresetUser('user_teacher_1'), true);
    assert.equal(isPresetUser('user_student_1'), true);
    assert.equal(isPresetUser('user_student_2'), true);
    assert.equal(isPresetUser('user_student_3'), true);
    assert.equal(isPresetUser('user_1795000000_abc'), false);

    assert.equal(
      formatAccountDisplayName({ id: 'user_teacher_1', name: 'Dr. Robert Vance' }),
      'Dr. Robert Vance (Demo)',
    );
    assert.equal(
      formatAccountDisplayName({ id: 'user_student_1', name: 'Alex Chen' }),
      'Alex Chen (Demo)',
    );
    // Idempotent if already suffixed
    assert.equal(
      formatAccountDisplayName({ id: 'user_student_1', name: 'Alex Chen (Demo)' }),
      'Alex Chen (Demo)',
    );
    // Non-preset user added by the user MUST NOT get (Demo)
    assert.equal(
      formatAccountDisplayName({ id: 'user_custom_99', name: 'Jordan Taylor' }),
      'Jordan Taylor',
    );
  });
});
