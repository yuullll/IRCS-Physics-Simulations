import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MOTION_PARAMS,
  evaluateMotionState,
  computeIntervalAnalysis,
  generateLimitConvergenceTable,
  sampleMotionSeries,
  computeGraphBounds,
} from './kinematics-1-2';

test('1.2.A.2 & 1.2.C.2: Displacement equals definite integral of velocity (cubic turnaround)', () => {
  const analysis = computeIntervalAnalysis('cubic_turnaround', 1.0, 3.0);
  const dx = analysis.displacement.x;
  assert.ok(Math.abs(dx - analysis.integralVx) < 1e-6, `Expected dx (${dx}) == integralVx (${analysis.integralVx})`);
  assert.ok(Math.abs(analysis.deltaV.x - analysis.integralAx) < 1e-6, 'Expected Δv_x == ∫a_x dt');
});

test('1.2.B.2 & 1.2.B.3: Average velocity and average acceleration match Δr/Δt and Δv/Δt', () => {
  const params = DEFAULT_MOTION_PARAMS.curved_turning;
  const analysis = computeIntervalAnalysis('curved_turning', 0.5, 2.0, params);

  assert.ok(Math.abs(analysis.vAvg.x - analysis.displacement.x / 2.0) < 1e-9);
  assert.ok(Math.abs(analysis.vAvg.z - analysis.displacement.z / 2.0) < 1e-9);
  assert.ok(Math.abs(analysis.aAvg.x - analysis.deltaV.x / 2.0) < 1e-9);
  assert.ok(Math.abs(analysis.aAvg.z - analysis.deltaV.z / 2.0) < 1e-9);
});

test('1.2.B.4: Uniform circular turn has constant speed |v| yet non-zero centripetal acceleration', () => {
  const params = DEFAULT_MOTION_PARAMS.constant_speed_turn;
  const s0 = evaluateMotionState('constant_speed_turn', 0.0, params);
  const s1 = evaluateMotionState('constant_speed_turn', 1.25, params);

  const expectedSpeed = params.radius * params.omega;
  const expectedAccel = params.radius * params.omega * params.omega;

  assert.ok(Math.abs(s0.speed - expectedSpeed) < 1e-9);
  assert.ok(Math.abs(s1.speed - expectedSpeed) < 1e-9);
  assert.ok(Math.abs(s0.aTangential) < 1e-9, 'Tangential acceleration should be 0 when speed is constant');
  assert.ok(Math.abs(s0.aNormal - expectedAccel) < 1e-9, 'Normal acceleration should equal Rω²');
  assert.ok(s0.accelMag > 1.0, 'Acceleration magnitude must be non-zero due to direction change');
});

test('1.2.B.5 & 1.2.C.1: Shrinking Δt -> 0 causes v_avg -> v(t1) and a_avg -> a(t1) monotonically', () => {
  const rows = generateLimitConvergenceTable('oscillating_wave', 0.8);
  assert.equal(rows.length, 6);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i].vErr <= rows[i - 1].vErr + 1e-9,
      `Velocity convergence error should decrease as dt shrinks: ${rows[i].vErr} vs ${rows[i - 1].vErr}`
    );
  }
  const smallest = rows[rows.length - 1];
  assert.ok(smallest.vErr < 0.05, `At dt=0.01s, v_avg should be within 0.05 m/s of v_inst (got ${smallest.vErr})`);
  assert.ok(smallest.aErr < 0.08, `At dt=0.01s, a_avg should be within 0.08 m/s² of a_inst (got ${smallest.aErr})`);
});

test('1.2.A.2 vs Scalar Distance: Turning around produces scalarDistance > |displacement|', () => {
  // Cubic turnaround starts with vx0 = +8.5, ax0 = -4.2, jx = 0.65 -> reverses direction inside [0, 6]
  const analysis = computeIntervalAnalysis('cubic_turnaround', 0, 6.0);
  assert.ok(
    analysis.scalarDistance > analysis.displacementMag,
    `Scalar path distance (${analysis.scalarDistance}) should exceed displacement magnitude (${analysis.displacementMag}) after turnaround`
  );
});

test('1.B Sampling: sampleMotionSeries returns expected count and endpoints', () => {
  const series = sampleMotionSeries('oscillating_wave', 0, 8, 80);
  assert.equal(series.length, 81);
  assert.equal(series[0].t, 0);
  assert.equal(series[80].t, 8);
});

test('1.B Graph Bounds: computeGraphBounds yields monotonic ticks encompassing min/max values', () => {
  const bounds = computeGraphBounds([-6.3, 1.2, 7.8]);
  assert.ok(bounds.minY <= -6.3);
  assert.ok(bounds.maxY >= 7.8);
  assert.ok(bounds.ticks.length >= 3);
  for (let i = 1; i < bounds.ticks.length; i++) {
    assert.ok(bounds.ticks[i] > bounds.ticks[i - 1]);
  }
});
