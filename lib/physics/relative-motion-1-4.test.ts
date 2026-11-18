import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RELATIVE_PARAMS,
  evaluateRelativeState,
  sampleRelativeTrajectories,
  computeVectorDiagramLayout,
  vecMag,
} from './relative-motion-1-4';

test('1.4.B.2.i & 1.4.B.2.ii: Train toss yields parabolic v_P/E, vertical v_P/M, and identical inertial acceleration', () => {
  const params = DEFAULT_RELATIVE_PARAMS.train_toss;
  const st = evaluateRelativeState('train_toss', 0.8, params);

  // Velocity vector addition identity v_PE = v_PM + v_ME
  assert.ok(st.galileanVelocityResidual < 1e-9);
  assert.ok(Math.abs(st.vPM.x) < 1e-9, 'Ball stays directly over cart in M frame');
  assert.ok(Math.abs(st.vPE.x - params.vMEx) < 1e-9, 'Earth frame sees horizontal cart speed');

  // Acceleration invariance across inertial reference frames (EK 1.4.B.2.ii)
  assert.ok(st.accelInvarianceDelta < 1e-9);
  assert.ok(Math.abs(st.aPE.y + params.accelMag) < 1e-9);
  assert.ok(Math.abs(st.aPM.y + params.accelMag) < 1e-9);
});

test('1.4.B.2.i: River boat upstream heading cancels downstream current drift when sin(theta) = -v_W/E / v_B/W', () => {
  const zeroDriftAngle = (-Math.asin(3.0 / 5.0) * 180) / Math.PI; // -36.869897... deg
  const params = {
    ...DEFAULT_RELATIVE_PARAMS.river_crossing,
    vMEx: 3.0,
    boatSpeed: 5.0,
    boatHeadingDeg: zeroDriftAngle,
  };
  const st = evaluateRelativeState('river_crossing', 2.0, params);

  assert.ok(st.galileanVelocityResidual < 1e-9);
  assert.ok(st.riverMetrics);
  assert.ok(Math.abs(st.riverMetrics.vxNet) < 1e-6, 'Net x velocity relative to bank should vanish');
  assert.ok(Math.abs(st.vPE.z - 4.0) < 1e-6, '3-4-5 triangle across-river speed = 4.0 m/s');
  assert.ok(
    st.riverMetrics.downstreamDrift !== null && Math.abs(st.riverMetrics.downstreamDrift) < 1e-5,
    'Downstream drift should be zero'
  );
  assert.ok(
    st.riverMetrics.crossingTime !== null && Math.abs(st.riverMetrics.crossingTime - 6.0) < 1e-5,
    'Crossing 24m at 4 m/s takes 6.0 s'
  );
});

test('1.4.A.1 & 1.4.B.1: Highway observer moving faster than target flips relative velocity sign', () => {
  const params = {
    ...DEFAULT_RELATIVE_PARAMS.highway_overtake,
    vMEx: 10.0,
    vPMx: 6.0, // Initial Earth-frame velocity of Car P
    accelMag: 0,
  };
  const st = evaluateRelativeState('highway_overtake', 1.5, params);

  assert.ok(st.vPE.x > 0, 'In Earth frame, Car P moves in +x');
  assert.ok(Math.abs(st.vPM.x - -4.0) < 1e-9, 'In Car M frame, Car P moves in -x at -4 m/s');
  assert.ok(st.galileanVelocityResidual < 1e-9);
});

test('1.4.B.2.ii: 2D Accelerating crosswind drone preserves Galilean velocity & identical acceleration', () => {
  const params = DEFAULT_RELATIVE_PARAMS.crosswind_accel;
  const st = evaluateRelativeState('crosswind_accel', 2.75, params);

  assert.ok(st.galileanVelocityResidual < 1e-9);
  assert.ok(st.accelInvarianceDelta < 1e-9);
  assert.ok(Math.abs(vecMag(st.aPE) - params.accelMag) < 1e-9);
  assert.ok(Math.abs(vecMag(st.aPM) - params.accelMag) < 1e-9);
});

test('Trajectories in Earth vs Platform frames satisfy r_P/M(t) = r_P/E(t) - r_M/E(t)', () => {
  const params = DEFAULT_RELATIVE_PARAMS.crosswind_accel;
  const earthSamples = sampleRelativeTrajectories('crosswind_accel', params, 'earth', 0, 20);
  const platSamples = sampleRelativeTrajectories('crosswind_accel', params, 'platform', 0, 20);

  assert.equal(earthSamples.length, 21);
  for (let i = 0; i < earthSamples.length; i++) {
    const st = evaluateRelativeState('crosswind_accel', earthSamples[i].t, params);
    const diffX = earthSamples[i].posInObserver.x - st.rME.x;
    const diffZ = earthSamples[i].posInObserver.z - st.rME.z;
    assert.ok(Math.abs(diffX - platSamples[i].posInObserver.x) < 1e-9);
    assert.ok(Math.abs(diffZ - platSamples[i].posInObserver.z) < 1e-9);
  }
});

test('1.A SVG VectorDiagramLayout stays bounded within viewport padding', () => {
  const st = evaluateRelativeState('crosswind_accel', 3.0, DEFAULT_RELATIVE_PARAMS.crosswind_accel);
  const layout = computeVectorDiagramLayout(st, 'xz', 280, 164, 24);

  for (const pt of [layout.origin, layout.tipME, layout.tipPE]) {
    assert.ok(pt.x >= 23.9 && pt.x <= 256.1, `x=${pt.x} out of bounds`);
    assert.ok(pt.y >= 23.9 && pt.y <= 140.1, `y=${pt.y} out of bounds`);
  }
});
