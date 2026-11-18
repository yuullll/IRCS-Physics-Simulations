import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MOTION15_PARAMS,
  computeComponentGraphLayout,
  evaluateMotion15State,
  sampleMotion15Series,
  solveFreeFallImpactTime,
} from './motion-2d-3d-1-5';

test('1.5.A.3: Changing horizontal v_0x or horizontal thruster a_x does not alter y(t) or drop time', () => {
  const base = { ...DEFAULT_MOTION15_PARAMS.drop_vs_launch, h0: 19.6, vy0: 0, gravity: 9.8 };
  const fastHoriz = { ...base, vx0: 15.0, axExtra: 4.0 };
  const slowHoriz = { ...base, vx0: 1.5, axExtra: -2.0 };

  const stFast = evaluateMotion15State('drop_vs_launch', 1.2, fastHoriz);
  const stSlow = evaluateMotion15State('drop_vs_launch', 1.2, slowHoriz);

  // At t = 1.2s, both Body B (launched) and Body A (dropped) share exact same y and vy
  assert.ok(Math.abs(stFast.primary.r.y - stFast.referenceDrop!.r.y) < 1e-9);
  assert.ok(Math.abs(stSlow.primary.r.y - stSlow.referenceDrop!.r.y) < 1e-9);
  assert.ok(Math.abs(stFast.primary.v.y - stSlow.primary.v.y) < 1e-9);

  // Horizontal positions differ markedly because of independent x-motion
  assert.ok(stFast.primary.r.x > stSlow.primary.r.x + 15);

  // Both hit ground at exactly t = sqrt(2 * 19.6 / 9.8) = 2.0 s
  assert.ok(Math.abs((stFast.metrics.impactTimePrimary ?? 0) - 2.0) < 1e-9);
  assert.ok(Math.abs((stFast.metrics.impactTimeReference ?? 0) - 2.0) < 1e-9);
  assert.ok(Math.abs((stSlow.metrics.impactTimePrimary ?? 0) - 2.0) < 1e-9);
});

test('1.5.A.4 & Skill 2.D: 2D Projectile special case validates a_x=0, a_y=-g, and 2x speed -> 4x range', () => {
  const params = {
    ...DEFAULT_MOTION15_PARAMS.projectile_2d,
    h0: 0,
    launchSpeed: 14,
    launchAngleDeg: 45,
    gravity: 9.8,
    scaleFactor: 2 as const,
  };
  const st = evaluateMotion15State('projectile_2d', 0.5, params);

  assert.equal(st.primary.a.x, 0);
  assert.equal(st.primary.a.y, -9.8);
  assert.ok(Math.abs(st.primary.v.x - 14 * Math.cos(Math.PI / 4)) < 1e-9);

  // Exact range at 45 deg is v0^2 / g = 196 / 9.8 = 20.0 m
  assert.ok(Math.abs(st.metrics.horizontalRange - 20.0) < 1e-6);
  // Doubling v0 quadruples range (80.0 m) and doubles flight time
  assert.ok(Math.abs((st.metrics.rangeRatio ?? 0) - 4.0) < 1e-6);
  assert.ok(Math.abs((st.metrics.timeRatio ?? 0) - 2.0) < 1e-6);
});

test('1.5.A.1 & 1.5.A.2: Nonuniform 2D calculus integration matches numerical derivatives dx/dt, dv/dt', () => {
  const params = { ...DEFAULT_MOTION15_PARAMS.nonuniform_2d };
  const t = 1.75;
  const eps = 1e-5;

  const st0 = evaluateMotion15State('nonuniform_2d', t - eps, params);
  const stMid = evaluateMotion15State('nonuniform_2d', t, params);
  const st1 = evaluateMotion15State('nonuniform_2d', t + eps, params);

  const numVx = (st1.primary.r.x - st0.primary.r.x) / (2 * eps);
  const numVy = (st1.primary.r.y - st0.primary.r.y) / (2 * eps);
  const numAx = (st1.primary.v.x - st0.primary.v.x) / (2 * eps);
  const numAy = (st1.primary.v.y - st0.primary.v.y) / (2 * eps);

  assert.ok(Math.abs(numVx - stMid.primary.v.x) < 1e-5);
  assert.ok(Math.abs(numVy - stMid.primary.v.y) < 1e-5);
  assert.ok(Math.abs(numAx - stMid.primary.a.x) < 1e-5);
  assert.ok(Math.abs(numAy - stMid.primary.a.y) < 1e-5);
});

test('1.5 Boundary Statement: 3D helix keeps X-Z circular radius invariant under vertical acceleration changes', () => {
  const p1 = { ...DEFAULT_MOTION15_PARAMS.qualitative_3d, helixRadius: 4.5, vy0: 1.0, azThrustY: 0 };
  const p2 = { ...DEFAULT_MOTION15_PARAMS.qualitative_3d, helixRadius: 4.5, vy0: -2.0, azThrustY: 3.5 };

  const s1 = evaluateMotion15State('qualitative_3d', 2.4, p1);
  const s2 = evaluateMotion15State('qualitative_3d', 2.4, p2);

  assert.ok(Math.abs((s1.metrics.xzRadius ?? 0) - 4.5) < 1e-9);
  assert.ok(Math.abs((s2.metrics.xzRadius ?? 0) - 4.5) < 1e-9);
  assert.notEqual(s1.primary.r.y, s2.primary.r.y);
});

test('Skill 1.B: Component graph layout keeps SVG paths and ticks within viewport bounds', () => {
  const params = DEFAULT_MOTION15_PARAMS.nonuniform_2d;
  const series = sampleMotion15Series('nonuniform_2d', params, 4.5, 48);
  const layout = computeComponentGraphLayout(series, 'velocity', 2.0, 290, 136);

  assert.ok(layout.xPath.startsWith('M '));
  assert.ok(layout.yPath.startsWith('M '));
  assert.equal(layout.yTicks.length, 3);
  assert.ok(layout.markerPxX >= layout.padLeft && layout.markerPxX <= layout.width - layout.padRight);
  assert.ok(layout.yTicks[0].value < layout.yTicks[2].value);
});

test('solveFreeFallImpactTime handles elevated horizontal & upward launches accurately', () => {
  const tHoriz = solveFreeFallImpactTime(4.9, 0, 9.8);
  assert.ok(tHoriz !== null && Math.abs(tHoriz - 1.0) < 1e-9);
  const tUp = solveFreeFallImpactTime(0, 9.8, 9.8);
  assert.ok(tUp !== null && Math.abs(tUp - 2.0) < 1e-9);
});
