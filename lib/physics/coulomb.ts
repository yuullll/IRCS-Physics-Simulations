import * as THREE from 'three';

export const COULOMB_K = 8.9875517923e9; // N·m²/C²
export const EPSILON_0 = 8.8541878128e-12; // C²/(N·m²)
export const DEFAULT_SOFTENING = 0.35;

export interface SourceCharge {
  id: string;
  q: number; // in Coulombs
  qMicro: number; // in μC
  x: number;
  y: number;
  z: number;
  pinned?: boolean;
}

export interface TestParticle {
  id: string;
  q: number; // Coulombs
  mass: number; // kg
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  acc: THREE.Vector3;
  color: number;
  trail: THREE.Vector3[];
  maxTrail: number;
  initialEnergy: number;
  currentEnergy: {
    kinetic: number;
    potential: number;
    total: number;
  };
  workDone: number;
  active: boolean;
  absorbing?: boolean;
  scale?: number;
  timeAccumulator?: number;
}

/**
 * Calculates net electric field vector E at any point in 3D space
 */
export function calculateElectricField(
  point: THREE.Vector3,
  charges: SourceCharge[],
  softening: number = DEFAULT_SOFTENING
): THREE.Vector3 {
  const E = new THREE.Vector3(0, 0, 0);
  const rVec = new THREE.Vector3();

  for (let i = 0; i < charges.length; i++) {
    const ch = charges[i];
    rVec.set(point.x - ch.x, point.y - ch.y, point.z - ch.z);
    const rSq = rVec.lengthSq() + softening * softening;
    const r = Math.sqrt(rSq);
    if (r < 1e-6) continue;

    const eMag = (COULOMB_K * ch.q) / rSq;
    rVec.normalize();
    E.addScaledVector(rVec, eMag);
  }

  return E;
}

/**
 * Calculates scalar electric potential V at any point in 3D space
 * V = sum (k * q_i / r_i)
 */
export function calculateElectricPotential(
  point: THREE.Vector3,
  charges: SourceCharge[],
  softening: number = DEFAULT_SOFTENING
): number {
  let V = 0;
  for (let i = 0; i < charges.length; i++) {
    const ch = charges[i];
    const dx = point.x - ch.x;
    const dy = point.y - ch.y;
    const dz = point.z - ch.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + softening * softening);
    if (dist > 1e-6) {
      V += (COULOMB_K * ch.q) / dist;
    }
  }
  return V;
}

/**
 * Lorentz Force: F = q * (E + v x B)
 */
export function calculateLorentzForce(
  point: THREE.Vector3,
  velocity: THREE.Vector3,
  charge: number,
  charges: SourceCharge[],
  bField: THREE.Vector3,
  softening: number = DEFAULT_SOFTENING
): THREE.Vector3 {
  const E = calculateElectricField(point, charges, softening);
  const vCrossB = new THREE.Vector3().crossVectors(velocity, bField);
  const totalField = E.add(vCrossB);
  return totalField.multiplyScalar(charge);
}

export const SIMULATION_KINEMATIC_SCALE = 0.00035;
const FIXED_PHYSICS_DT = 0.002; // 2ms invariant integration micro-step
const ELECTRODE_CAPTURE_RADIUS = 0.85;

/**
 * Distance from point C to line segment AB for continuous collision detection
 */
function distPointToSegment(c: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-10) return ac.length();
  const t = Math.max(0, Math.min(1, ac.dot(ab) / abLenSq));
  const closest = a.clone().addScaledVector(ab, t);
  return c.distanceTo(closest);
}

/**
 * Single fixed-dt RK4 micro-step so trajectory is 100% independent of simulation speed
 */
function stepSingleRK4Micro(
  particle: TestParticle,
  charges: SourceCharge[],
  bField: THREE.Vector3,
  h: number,
  damping: number,
  lockToPlane: boolean,
  planeY: number
): void {
  if (!particle.active) return;

  const m = particle.mass;
  const q = particle.q;

  // Immediate check before stepping
  for (let i = 0; i < charges.length; i++) {
    const ch = charges[i];
    const chPos = new THREE.Vector3(ch.x, lockToPlane ? planeY : ch.y, ch.z);
    const dist = particle.pos.distanceTo(chPos);
    if (dist <= ELECTRODE_CAPTURE_RADIUS && q * ch.q < 0) {
      particle.active = false;
      particle.absorbing = true;
      particle.pos.copy(chPos);
      particle.vel.set(0, 0, 0);
      particle.trail.unshift(chPos.clone());
      return;
    }
  }

  // Derivation state function: given (pos, vel), return [vel, acc]
  const evalDerivative = (p: THREE.Vector3, v: THREE.Vector3) => {
    // Low softening (0.18) preserves true radial 1/r^2 central pull up to the electrode surface
    const F = calculateLorentzForce(p, v, q, charges, bField, 0.18);

    // Apply viscous damping / fluid resistance
    if (damping > 0) {
      F.addScaledVector(v, -damping * Math.max(m, 1e-6) * 14.0);
    }

    const realAcc = F.divideScalar(m);
    const scaledAcc = realAcc.multiplyScalar(SIMULATION_KINEMATIC_SCALE);

    if (lockToPlane) {
      scaledAcc.y = 0;
      v.y = 0;
    }

    return { vel: v.clone(), acc: scaledAcc };
  };

  const p0 = particle.pos.clone();
  const v0 = particle.vel.clone();
  if (lockToPlane) {
    p0.y = planeY;
    v0.y = 0;
  }

  // RK4 stages with fixed timestep h
  const k1 = evalDerivative(p0, v0);

  const p1 = p0.clone().addScaledVector(k1.vel, h * 0.5);
  const v1 = v0.clone().addScaledVector(k1.acc, h * 0.5);
  const k2 = evalDerivative(p1, v1);

  const p2 = p0.clone().addScaledVector(k2.vel, h * 0.5);
  const v2 = v0.clone().addScaledVector(k2.acc, h * 0.5);
  const k3 = evalDerivative(p2, v2);

  const p3 = p0.clone().addScaledVector(k3.vel, h);
  const v3 = v0.clone().addScaledVector(k3.acc, h);
  const k4 = evalDerivative(p3, v3);

  const dPos = k1.vel
    .clone()
    .addScaledVector(k2.vel, 2)
    .addScaledVector(k3.vel, 2)
    .add(k4.vel)
    .multiplyScalar(h / 6);

  const dVel = k1.acc
    .clone()
    .addScaledVector(k2.acc, 2)
    .addScaledVector(k3.acc, 2)
    .add(k4.acc)
    .multiplyScalar(h / 6);

  particle.pos.add(dPos);
  particle.vel.add(dVel);
  particle.acc.copy(k4.acc);

  if (lockToPlane) {
    particle.pos.y = planeY;
    particle.vel.y = 0;
    particle.acc.y = 0;
  }

  // Anti-spiral & continuous electrode capture check for attracting source charges
  for (let i = 0; i < charges.length; i++) {
    const ch = charges[i];
    const chPos = new THREE.Vector3(ch.x, lockToPlane ? planeY : ch.y, ch.z);
    const segDist = distPointToSegment(chPos, p0, particle.pos);

    if (q * ch.q < 0) {
      // Opposite polarity: attract and absorb without orbiting
      if (segDist <= ELECTRODE_CAPTURE_RADIUS) {
        particle.active = false;
        particle.absorbing = true;
        particle.pos.copy(chPos);
        particle.vel.set(0, 0, 0);
        particle.trail.unshift(chPos.clone());
        return;
      }

      // Near-field tangential (angular momentum) damping within r < 3.0m
      // Prevents slingshot/spiraling when a particle approaches an attracting charge along a curved field line
      const toCharge = new THREE.Vector3().subVectors(chPos, particle.pos);
      const dist = toCharge.length();
      if (dist < 3.0 && dist > 1e-5) {
        const rHat = toCharge.divideScalar(dist);
        const radialSpeed = particle.vel.dot(rHat);
        const vRadial = rHat.clone().multiplyScalar(radialSpeed);
        const vTangential = particle.vel.clone().sub(vRadial);
        const proximityFactor = 1.0 - dist / 3.0;
        const angularDamp = Math.exp(-28.0 * proximityFactor * proximityFactor * h);
        vTangential.multiplyScalar(angularDamp);
        // Ensure radial motion stays inward when very close
        if (dist < 1.8 && radialSpeed < 0) {
          vRadial.multiplyScalar(0.2);
        }
        particle.vel.copy(vRadial).add(vTangential);
      }
    } else if (q * ch.q > 0 && segDist < 0.72) {
      // Like polarity: prevent penetrating inside the repulsive source core
      const away = new THREE.Vector3().subVectors(particle.pos, chPos);
      if (lockToPlane) away.y = 0;
      if (away.lengthSq() > 1e-6) {
        away.normalize();
        particle.pos.copy(chPos).addScaledVector(away, 0.72);
        const radialIn = particle.vel.dot(away);
        if (radialIn < 0) {
          particle.vel.addScaledVector(away, -radialIn * 1.2);
        }
      }
    }
  }

  // Velocity ceiling clamp
  const maxSpeed = 28.0;
  if (particle.vel.length() > maxSpeed) {
    particle.vel.setLength(maxSpeed);
  }

  // Distance-based trail sampling so trail curve is identical at any simulation speed
  const lastTrailPt = particle.trail[0];
  if (!lastTrailPt || particle.pos.distanceTo(lastTrailPt) >= 0.12) {
    particle.trail.unshift(particle.pos.clone());
    if (particle.trail.length > particle.maxTrail) {
      particle.trail.pop();
    }
  }
}

/**
 * 4th-Order Runge-Kutta (RK4) Step for Lorentz Trajectory Integration
 * Uses fixed-timestep sub-stepping so changing simulation speed NEVER alters the trajectory.
 */
export function stepParticleRK4(
  particle: TestParticle,
  charges: SourceCharge[],
  bField: THREE.Vector3,
  dt: number,
  damping: number = 0.0,
  lockToPlane: boolean = true,
  planeY: number = 0.65
): void {
  if (!particle.active) return;

  const prevSpeedSq = particle.vel.lengthSq();
  const m = particle.mass;
  const q = particle.q;

  // Accumulate elapsed scaled time and advance in strictly constant FIXED_PHYSICS_DT steps
  const totalTime = (particle.timeAccumulator ?? 0) + Math.min(dt, 0.25);
  const maxSubSteps = 140;
  let steps = 0;
  let remaining = totalTime;

  while (remaining >= FIXED_PHYSICS_DT && steps < maxSubSteps && particle.active) {
    stepSingleRK4Micro(particle, charges, bField, FIXED_PHYSICS_DT, damping, lockToPlane, planeY);
    remaining -= FIXED_PHYSICS_DT;
    steps++;
  }

  particle.timeAccumulator = particle.active ? remaining : 0;

  // Mechanical Energy computation in real SI units
  const speed = particle.vel.length();
  const kinetic = 0.5 * m * speed * speed;
  const potential = q * calculateElectricPotential(particle.pos, charges);
  const total = kinetic + potential;

  particle.workDone = kinetic - 0.5 * m * prevSpeedSq;
  particle.currentEnergy = {
    kinetic,
    potential,
    total,
  };
}

/**
 * Traces a tangent electric field line (streamline) starting from seedPoint
 * using RK4 integration along normalized E-field tangent.
 */
export function traceFieldLine(
  seedPoint: THREE.Vector3,
  charges: SourceCharge[],
  stepSize: number = 0.35,
  maxSteps: number = 120,
  forward: boolean = true
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [seedPoint.clone()];
  const current = seedPoint.clone();

  for (let s = 0; s < maxSteps; s++) {
    // Check if close to any charge (sink or source)
    let reachedCharge = false;
    for (let i = 0; i < charges.length; i++) {
      const ch = charges[i];
      const d = current.distanceTo(new THREE.Vector3(ch.x, ch.y, ch.z));
      if (d < 0.65 && s > 2) {
        reachedCharge = true;
        break;
      }
    }
    if (reachedCharge) break;

    // Boundary check covering full Cartesian grid
    if (Math.abs(current.x) > 31 || Math.abs(current.y) > 31 || Math.abs(current.z) > 31) {
      break;
    }

    // RK4 step along normalized E field
    const getTangent = (p: THREE.Vector3) => {
      const E = calculateElectricField(p, charges);
      if (E.lengthSq() < 1e-8) return new THREE.Vector3(0, 0, 0);
      const t = E.normalize();
      return forward ? t : t.negate();
    };

    const k1 = getTangent(current);
    if (k1.lengthSq() === 0) break;

    const p1 = current.clone().addScaledVector(k1, stepSize * 0.5);
    const k2 = getTangent(p1);

    const p2 = current.clone().addScaledVector(k2, stepSize * 0.5);
    const k3 = getTangent(p2);

    const p3 = current.clone().addScaledVector(k3, stepSize);
    const k4 = getTangent(p3);

    const delta = k1
      .clone()
      .addScaledVector(k2, 2)
      .addScaledVector(k3, 2)
      .add(k4)
      .multiplyScalar(stepSize / 6);

    current.add(delta);
    points.push(current.clone());
  }

  return points;
}
