import * as THREE from 'three';

export type DragModel = 'vacuum' | 'linear' | 'quadratic';

export interface ProjectileParameters {
  mass: number; // kg
  radius: number; // meters
  dragCoefficient: number; // Cd (dimensionless, ~0.47 for sphere)
  airDensity: number; // kg/m^3 (~1.225 at sea level)
  gravity: number; // m/s^2 (~9.81)
  stokesB: number; // linear drag constant b (N·s/m)
}

export interface LaunchParameters {
  x0: number;
  y0: number;
  z0: number;
  speed: number; // m/s
  elevationDeg: number; // 0 to 90 degrees (angle above horizontal)
  azimuthDeg: number; // 0 to 360 degrees (angle in horizontal xz-plane, 0 = +x)
  wind: { x: number; y: number; z: number }; // m/s wind velocity
}

export interface KinematicFormulaProof {
  formulaNumber: 1 | 2 | 3 | 4 | 5;
  name: string;
  latex: string;
  appliesToDrag: boolean;
  leftHandSideName: string;
  leftHandSideValue: number;
  rightHandSideName: string;
  rightHandSideValue: number;
  discrepancy: number; // |LHS - RHS|
  percentError: number;
  status: 'exact' | 'valid_calculus' | 'invalidated_by_drag';
  explanation: string;
}

export interface TrajectorySample {
  time: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  ax: number;
  ay: number;
  az: number;
  dragFx: number;
  dragFy: number;
  dragFz: number;
  intVxDt: number; // ∫ v_x dt
  intAxDt: number; // ∫ a_x dt
  intVyDt: number; // ∫ v_y dt
  intAyDt: number; // ∫ a_y dt
}

export interface TrajectorySummary {
  dragModel: DragModel;
  color: string;
  points: TrajectorySample[];
  apex: { x: number; y: number; z: number; time: number; speed: number };
  landing: { x: number; y: number; z: number; time: number; speed: number };
  maxRange: number;
  maxHeight: number;
  flightTime: number;
  terminalVelocity: number; // theoretical terminal fall speed (m/s)
}

export const PROJECTILE_PRESETS: Record<
  string,
  {
    name: string;
    description: string;
    mass: number;
    radius: number;
    cd: number;
    color: string;
  }
> = {
  cannonball: {
    name: 'Heavy Cannonball',
    description: '10 kg solid iron sphere with low drag ratio (standard AP ballistics model)',
    mass: 10.0,
    radius: 0.08,
    cd: 0.47,
    color: '#38bdf8', // sky
  },
  baseball: {
    name: 'Major League Baseball',
    description: '145 g regulation stitched sphere (noticeable air resistance at high speeds)',
    mass: 0.145,
    radius: 0.037,
    cd: 0.32,
    color: '#f59e0b', // amber
  },
  tennis: {
    name: 'Tennis Ball (Felt)',
    description: '58 g hollow pressurized fuzzy ball with high aerodynamic drag',
    mass: 0.058,
    radius: 0.033,
    cd: 0.55,
    color: '#10b981', // emerald
  },
  bullet: {
    name: 'Supersonic Rifle Bullet',
    description: '10 g streamlined spitzer projectile with minimal drag coefficient',
    mass: 0.01,
    radius: 0.0045,
    cd: 0.16,
    color: '#fb7185', // rose
  },
  feather: {
    name: 'High-Drag Feather / Parachute',
    description: '5 g lightweight bluff body reaching terminal velocity almost instantaneously',
    mass: 0.005,
    radius: 0.05,
    cd: 1.2,
    color: '#a78bfa', // purple
  },
};

/**
 * Compute quadratic drag coefficient c: F_d = 1/2 * rho * Cd * A * v^2 = c * v^2
 * where A = π * r^2
 */
export function getQuadraticDragConstant(
  radius: number,
  cd: number,
  airDensity: number = 1.225
): number {
  const area = Math.PI * radius * radius;
  return 0.5 * airDensity * cd * area;
}

/**
 * Compute theoretical terminal fall speed in vertical gravity:
 * v_term = sqrt((m * g) / c)
 */
export function getTerminalVelocity(
  mass: number,
  gravity: number,
  dragModel: DragModel,
  radius: number,
  cd: number,
  airDensity: number = 1.225,
  stokesB: number = 0.5
): number {
  if (dragModel === 'vacuum') return Infinity;
  if (dragModel === 'linear') {
    return (mass * gravity) / Math.max(1e-4, stokesB);
  }
  const c = getQuadraticDragConstant(radius, cd, airDensity);
  if (c <= 1e-7) return Infinity;
  return Math.sqrt((mass * gravity) / c);
}

/**
 * 4th-Order Runge-Kutta Numerical Ballistics Integrator
 * Solves:
 * d r/dt = v
 * d v/dt = g + F_drag(v_rel) / m
 * where:
 *   Vacuum: F_drag = 0
 *   Linear: F_drag = -b * v_rel
 *   Quadratic: F_drag = -c * |v_rel| * v_rel
 */
export function computeTrajectoryRK4(
  launch: LaunchParameters,
  projectile: ProjectileParameters,
  dragModel: DragModel,
  dt: number = 0.005,
  maxTime: number = 60.0
): TrajectorySummary {
  const elevRad = (launch.elevationDeg * Math.PI) / 180;
  const azimRad = (launch.azimuthDeg * Math.PI) / 180;

  // Initial velocity decomposition
  const vHorizontal = launch.speed * Math.cos(elevRad);
  const vx0 = vHorizontal * Math.cos(azimRad);
  const vy0 = launch.speed * Math.sin(elevRad);
  const vz0 = vHorizontal * Math.sin(azimRad);

  const points: TrajectorySample[] = [];

  let t = 0;
  let x = launch.x0;
  let y = launch.y0;
  let z = launch.z0;
  let vx = vx0;
  let vy = vy0;
  let vz = vz0;

  let intVx = 0;
  let intVy = 0;
  let intAx = 0;
  let intAy = 0;

  const cQuad = getQuadraticDragConstant(
    projectile.radius,
    projectile.dragCoefficient,
    projectile.airDensity
  );
  const bLinear = projectile.stokesB;
  const m = Math.max(1e-4, projectile.mass);
  const g = projectile.gravity;

  const computeAcceleration = (
    currVx: number,
    currVy: number,
    currVz: number
  ): { ax: number; ay: number; az: number; fx: number; fy: number; fz: number } => {
    // Relative air speed including wind
    const relVx = currVx - launch.wind.x;
    const relVy = currVy - launch.wind.y;
    const relVz = currVz - launch.wind.z;
    const relSpeed = Math.hypot(relVx, relVy, relVz);

    let fx = 0;
    let fy = 0;
    let fz = 0;

    if (dragModel === 'linear') {
      fx = -bLinear * relVx;
      fy = -bLinear * relVy;
      fz = -bLinear * relVz;
    } else if (dragModel === 'quadratic') {
      fx = -cQuad * relSpeed * relVx;
      fy = -cQuad * relSpeed * relVy;
      fz = -cQuad * relSpeed * relVz;
    }

    const ax = fx / m;
    const ay = -g + fy / m;
    const az = fz / m;

    return { ax, ay, az, fx, fy, fz };
  };

  // Initial point at t = 0
  const initialAccel = computeAcceleration(vx, vy, vz);
  points.push({
    time: 0,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    speed: Math.hypot(vx, vy, vz),
    ax: initialAccel.ax,
    ay: initialAccel.ay,
    az: initialAccel.az,
    dragFx: initialAccel.fx,
    dragFy: initialAccel.fy,
    dragFz: initialAccel.fz,
    intVxDt: 0,
    intAxDt: 0,
    intVyDt: 0,
    intAyDt: 0,
  });

  let prevY = y;
  let apexPoint = { ...points[0] };
  let passedApex = false;

  const maxSteps = Math.floor(maxTime / dt);

  for (let step = 0; step < maxSteps; step++) {
    // RK4 Integration for coupled ODE: dr/dt = v, dv/dt = a(v)
    // k1
    const a1 = computeAcceleration(vx, vy, vz);
    const kv1_x = a1.ax;
    const kv1_y = a1.ay;
    const kv1_z = a1.az;
    const kr1_x = vx;
    const kr1_y = vy;
    const kr1_z = vz;

    // k2
    const vx2 = vx + 0.5 * dt * kv1_x;
    const vy2 = vy + 0.5 * dt * kv1_y;
    const vz2 = vz + 0.5 * dt * kv1_z;
    const a2 = computeAcceleration(vx2, vy2, vz2);
    const kv2_x = a2.ax;
    const kv2_y = a2.ay;
    const kv2_z = a2.az;
    const kr2_x = vx2;
    const kr2_y = vy2;
    const kr2_z = vz2;

    // k3
    const vx3 = vx + 0.5 * dt * kv2_x;
    const vy3 = vy + 0.5 * dt * kv2_y;
    const vz3 = vz + 0.5 * dt * kv2_z;
    const a3 = computeAcceleration(vx3, vy3, vz3);
    const kv3_x = a3.ax;
    const kv3_y = a3.ay;
    const kv3_z = a3.az;
    const kr3_x = vx3;
    const kr3_y = vy3;
    const kr3_z = vz3;

    // k4
    const vx4 = vx + dt * kv3_x;
    const vy4 = vy + dt * kv3_y;
    const vz4 = vz + dt * kv3_z;
    const a4 = computeAcceleration(vx4, vy4, vz4);
    const kv4_x = a4.ax;
    const kv4_y = a4.ay;
    const kv4_z = a4.az;
    const kr4_x = vx4;
    const kr4_y = vy4;
    const kr4_z = vz4;

    // Update state using RK4 weighted average
    const nextVx = vx + (dt / 6) * (kv1_x + 2 * kv2_x + 2 * kv3_x + kv4_x);
    const nextVy = vy + (dt / 6) * (kv1_y + 2 * kv2_y + 2 * kv3_y + kv4_y);
    const nextVz = vz + (dt / 6) * (kv1_z + 2 * kv2_z + 2 * kv3_z + kv4_z);

    const nextX = x + (dt / 6) * (kr1_x + 2 * kr2_x + 2 * kr3_x + kr4_x);
    const nextY = y + (dt / 6) * (kr1_y + 2 * kr2_y + 2 * kr3_y + kr4_y);
    const nextZ = z + (dt / 6) * (kr1_z + 2 * kr2_z + 2 * kr3_z + kr4_z);

    // Trapezoidal rule integration for the AP calculus kinematics formulas:
    // Δx = ∫ v_x dt, Δv_x = ∫ a_x dt
    const avgVx = 0.5 * (vx + nextVx);
    const avgVy = 0.5 * (vy + nextVy);
    const currAccel = computeAcceleration(vx, vy, vz);
    const nextAccel = computeAcceleration(nextVx, nextVy, nextVz);
    const avgAx = 0.5 * (currAccel.ax + nextAccel.ax);
    const avgAy = 0.5 * (currAccel.ay + nextAccel.ay);

    intVx += avgVx * dt;
    intVy += avgVy * dt;
    intAx += avgAx * dt;
    intAy += avgAy * dt;

    t += dt;
    x = nextX;
    y = nextY;
    z = nextZ;
    vx = nextVx;
    vy = nextVy;
    vz = nextVz;

    // Detect apex (vertical turnaround vy changes sign)
    if (!passedApex && vy < 0 && prevY > y) {
      passedApex = true;
      apexPoint = {
        time: t,
        x,
        y,
        z,
        vx,
        vy,
        vz,
        speed: Math.hypot(vx, vy, vz),
        ax: nextAccel.ax,
        ay: nextAccel.ay,
        az: nextAccel.az,
        dragFx: nextAccel.fx,
        dragFy: nextAccel.fy,
        dragFz: nextAccel.fz,
        intVxDt: intVx,
        intAxDt: intAx,
        intVyDt: intVy,
        intAyDt: intAy,
      };
    }
    prevY = y;

    // Record sample (sample every 2 steps for silky rendering efficiency)
    if (step % 2 === 0 || y <= 0) {
      points.push({
        time: t,
        x,
        y,
        z,
        vx,
        vy,
        vz,
        speed: Math.hypot(vx, vy, vz),
        ax: nextAccel.ax,
        ay: nextAccel.ay,
        az: nextAccel.az,
        dragFx: nextAccel.fx,
        dragFy: nextAccel.fy,
        dragFz: nextAccel.fz,
        intVxDt: intVx,
        intAxDt: intAx,
        intVyDt: intVy,
        intAyDt: intAy,
      });
    }

    // Stop upon impact with the ground plane (y <= 0)
    if (y <= 0 && step > 2) {
      break;
    }
  }

  const landingPoint = points[points.length - 1];
  const maxRange = Math.hypot(landingPoint.x - launch.x0, landingPoint.z - launch.z0);
  const maxHeight = Math.max(...points.map(p => p.y));

  const termVel = getTerminalVelocity(
    projectile.mass,
    projectile.gravity,
    dragModel,
    projectile.radius,
    projectile.dragCoefficient,
    projectile.airDensity,
    projectile.stokesB
  );

  const colors: Record<DragModel, string> = {
    vacuum: '#38bdf8', // sky
    linear: '#f59e0b', // amber
    quadratic: '#10b981', // emerald
  };

  return {
    dragModel,
    color: colors[dragModel],
    points,
    apex: {
      x: apexPoint.x,
      y: apexPoint.y,
      z: apexPoint.z,
      time: apexPoint.time,
      speed: apexPoint.speed,
    },
    landing: {
      x: landingPoint.x,
      y: landingPoint.y,
      z: landingPoint.z,
      time: landingPoint.time,
      speed: landingPoint.speed,
    },
    maxRange,
    maxHeight,
    flightTime: landingPoint.time,
    terminalVelocity: termVel,
  };
}

/**
 * Verify the 5 fundamental Kinematics formulas in the user's screenshot at a specific instant t:
 * 1. v_x = v_x0 + a_x * t
 * 2. x = x_0 + v_x0 * t + 1/2 * a_x * t^2
 * 3. v_x^2 = v_x0^2 + 2 * a_x * (x - x_0)
 * 4. Δx = ∫ v_x(t) dt
 * 5. Δv_x = ∫ a_x(t) dt
 */
export function verifyKinematicsFormulas(
  summary: TrajectorySummary,
  sampleIndex: number,
  launch: LaunchParameters
): KinematicFormulaProof[] {
  const points = summary.points;
  if (!points || points.length === 0) return [];

  const idx = Math.min(Math.max(0, sampleIndex), points.length - 1);
  const current = points[idx];
  const t = current.time;

  const elevRad = (launch.elevationDeg * Math.PI) / 180;
  const azimRad = (launch.azimuthDeg * Math.PI) / 180;
  const vx0 = launch.speed * Math.cos(elevRad) * Math.cos(azimRad);
  const x0 = launch.x0;

  const isVacuum = summary.dragModel === 'vacuum';

  // 1. Formula 1: v_x = v_x0 + a_x * t (assumes constant a_x = current.ax)
  const f1_lhs = current.vx;
  const f1_rhs = vx0 + current.ax * t;
  const f1_diff = Math.abs(f1_lhs - f1_rhs);
  const f1_pct = Math.abs(f1_lhs) > 1e-4 ? (f1_diff / Math.abs(f1_lhs)) * 100 : 0;

  // 2. Formula 2: x = x_0 + v_x0 * t + 0.5 * a_x * t^2 (assumes constant a_x)
  const f2_lhs = current.x;
  const f2_rhs = x0 + vx0 * t + 0.5 * current.ax * t * t;
  const f2_diff = Math.abs(f2_lhs - f2_rhs);
  const f2_pct = Math.abs(f2_lhs) > 1e-4 ? (f2_diff / Math.abs(f2_lhs)) * 100 : 0;

  // 3. Formula 3: v_x^2 = v_x0^2 + 2 * a_x * (x - x_0) (assumes constant a_x)
  const f3_lhs = current.vx * current.vx;
  const f3_rhs = vx0 * vx0 + 2 * current.ax * (current.x - x0);
  const f3_diff = Math.abs(f3_lhs - f3_rhs);
  const f3_pct = Math.abs(f3_lhs) > 1e-4 ? (f3_diff / Math.max(1e-4, Math.abs(f3_lhs))) * 100 : 0;

  // 4. Formula 4: Δx = ∫ v_x(t) dt (CALCULUS DEFINITION - ALWAYS EXACT!)
  const f4_lhs = current.x - x0;
  const f4_rhs = current.intVxDt;
  const f4_diff = Math.abs(f4_lhs - f4_rhs);
  const f4_pct = Math.abs(f4_lhs) > 1e-4 ? (f4_diff / Math.abs(f4_lhs)) * 100 : 0;

  // 5. Formula 5: Δv_x = ∫ a_x(t) dt (CALCULUS DEFINITION - ALWAYS EXACT!)
  const f5_lhs = current.vx - vx0;
  const f5_rhs = current.intAxDt;
  const f5_diff = Math.abs(f5_lhs - f5_rhs);
  const f5_pct = Math.abs(f5_lhs) > 1e-4 ? (f5_diff / Math.max(1e-4, Math.abs(f5_lhs))) * 100 : 0;

  return [
    {
      formulaNumber: 1,
      name: 'Velocity-Time Kinematic Relation',
      latex: 'v_x = v_{x0} + a_x t',
      appliesToDrag: false,
      leftHandSideName: 'v_x(t) [Instantaneous]',
      leftHandSideValue: f1_lhs,
      rightHandSideName: 'v_{x0} + a_x t',
      rightHandSideValue: f1_rhs,
      discrepancy: f1_diff,
      percentError: isVacuum ? 0 : f1_pct,
      status: isVacuum ? 'exact' : 'invalidated_by_drag',
      explanation: isVacuum
        ? 'In vacuum, a_x = 0 (constant). Velocity remains identically v_x0. Equation matches with 0.00% error.'
        : `Under non-linear drag, a_x(t) = -c|v|v_x / m is NOT constant! Using algebraic a_x·t yields a ${f1_pct.toFixed(1)}% error. You must integrate a_x(t)dt!`,
    },
    {
      formulaNumber: 2,
      name: 'Position-Time Kinematic Relation',
      latex: 'x = x_0 + v_{x0} t + \\frac{1}{2} a_x t^2',
      appliesToDrag: false,
      leftHandSideName: 'x(t) [True Position]',
      leftHandSideValue: f2_lhs,
      rightHandSideName: 'x_0 + v_{x0}t + ½a_x t²',
      rightHandSideValue: f2_rhs,
      discrepancy: f2_diff,
      percentError: isVacuum ? 0 : f2_pct,
      status: isVacuum ? 'exact' : 'invalidated_by_drag',
      explanation: isVacuum
        ? 'With constant acceleration a_x = 0, displacement is linear: x(t) = x_0 + v_x0·t. Exact agreement.'
        : `Drag decelerates the projectile non-linearly. The quadratic term ½a_x·t² overshoots true displacement by ${f2_diff.toFixed(2)} m.`,
    },
    {
      formulaNumber: 3,
      name: 'Work-Kinematic / Timeless Relation',
      latex: 'v_x^2 = v_{x0}^2 + 2 a_x (x - x_0)',
      appliesToDrag: false,
      leftHandSideName: 'v_x²',
      leftHandSideValue: f3_lhs,
      rightHandSideName: 'v_{x0}² + 2a_x(x - x_0)',
      rightHandSideValue: f3_rhs,
      discrepancy: f3_diff,
      percentError: isVacuum ? 0 : f3_pct,
      status: isVacuum ? 'exact' : 'invalidated_by_drag',
      explanation: isVacuum
        ? 'In conservative zero-drag flight, W_net = ΔK. Since a_x = 0, v_x² = v_x0². Formula holds exactly.'
        : 'Because acceleration depends continuously on speed, 2a_x·Δx fails to account for path-dependent aerodynamic dissipation.',
    },
    {
      formulaNumber: 4,
      name: 'Definite Integral of Velocity (Displacement)',
      latex: '\\Delta x = \\int v_x(t) \\, dt',
      appliesToDrag: true,
      leftHandSideName: 'Δx [Position Shift]',
      leftHandSideValue: f4_lhs,
      rightHandSideName: '∫ v_x(t) dt [Definite Integral]',
      rightHandSideValue: f4_rhs,
      discrepancy: f4_diff,
      percentError: f4_pct,
      status: 'valid_calculus',
      explanation: `Universally valid in both vacuum AND drag! The area under the v_x(t) curve equals displacement Δx = ${f4_lhs.toFixed(2)} m (Numerical Integral: ${f4_rhs.toFixed(2)} m, agreement: ${(100 - f4_pct).toFixed(2)}%).`,
    },
    {
      formulaNumber: 5,
      name: 'Definite Integral of Acceleration (Velocity Shift)',
      latex: '\\Delta v_x = \\int a_x(t) \\, dt',
      appliesToDrag: true,
      leftHandSideName: 'Δv_x = v_x(t) - v_{x0}',
      leftHandSideValue: f5_lhs,
      rightHandSideName: '∫ a_x(t) dt [Definite Integral]',
      rightHandSideValue: f5_rhs,
      discrepancy: f5_diff,
      percentError: f5_pct,
      status: 'valid_calculus',
      explanation: `Fundamental Theorem of Calculus in AP Mechanics: Even though a_x(t) is complex and non-linear, ∫ a_x(t) dt equals net velocity change Δv_x = ${f5_lhs.toFixed(2)} m/s (Integral: ${f5_rhs.toFixed(2)} m/s).`,
    },
  ];
}
