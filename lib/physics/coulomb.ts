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

/**
 * 4th-Order Runge-Kutta (RK4) Step for Lorentz Trajectory Integration
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

  const m = particle.mass;
  const q = particle.q;

  // Collision / Absorption check with oppositely charged source electrodes
  for (let i = 0; i < charges.length; i++) {
    const ch = charges[i];
    const chPos = new THREE.Vector3(ch.x, ch.y, ch.z);
    const dist = particle.pos.distanceTo(chPos);
    // Source charge sphere radius is ~0.65; opposite charges attract and absorb
    if (dist <= 0.75 && q * ch.q < 0) {
      particle.active = false;
      particle.absorbing = true;
      particle.pos.copy(chPos);
      particle.vel.set(0, 0, 0);
      return;
    }
  }

  // Derivation state function: given (pos, vel), return [vel, acc]
  const evalDerivative = (p: THREE.Vector3, v: THREE.Vector3) => {
    // Calculate real Lorentz force with softening to avoid singularity
    const F = calculateLorentzForce(p, v, q, charges, bField, 0.75);

    // Apply viscous damping / fluid resistance if configured
    if (damping > 0) {
      F.addScaledVector(v, -damping * Math.max(m, 1e-6) * 12.0);
    }

    // Kinematic acceleration scaled for human-observable, smooth 60fps dynamics
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

  // k1
  const k1 = evalDerivative(p0, v0);

  // k2
  const p1 = p0.clone().addScaledVector(k1.vel, dt * 0.5);
  const v1 = v0.clone().addScaledVector(k1.acc, dt * 0.5);
  const k2 = evalDerivative(p1, v1);

  // k3
  const p2 = p0.clone().addScaledVector(k2.vel, dt * 0.5);
  const v2 = v0.clone().addScaledVector(k2.acc, dt * 0.5);
  const k3 = evalDerivative(p2, v2);

  // k4
  const p3 = p0.clone().addScaledVector(k3.vel, dt);
  const v3 = v0.clone().addScaledVector(k3.acc, dt);
  const k4 = evalDerivative(p3, v3);

  // Update position: p += dt/6 * (k1.v + 2*k2.v + 2*k3.v + k4.v)
  const dPos = k1.vel
    .clone()
    .addScaledVector(k2.vel, 2)
    .addScaledVector(k3.vel, 2)
    .add(k4.vel)
    .multiplyScalar(dt / 6);

  // Update velocity: v += dt/6 * (k1.a + 2*k2.a + 2*k3.a + k4.a)
  const dVel = k1.acc
    .clone()
    .addScaledVector(k2.acc, 2)
    .addScaledVector(k3.acc, 2)
    .add(k4.acc)
    .multiplyScalar(dt / 6);

  particle.pos.add(dPos);
  particle.vel.add(dVel);
  particle.acc.copy(k4.acc);

  if (lockToPlane) {
    particle.pos.y = planeY;
    particle.vel.y = 0;
    particle.acc.y = 0;
  }

  // Velocity ceiling clamp to guarantee numerical stability
  const maxSpeed = 32.0;
  if (particle.vel.length() > maxSpeed) {
    particle.vel.setLength(maxSpeed);
  }

  // Mechanical Energy computation in real SI units
  const speed = particle.vel.length();
  const kinetic = 0.5 * m * speed * speed;
  const potential = q * calculateElectricPotential(particle.pos, charges);
  const total = kinetic + potential;

  particle.workDone = kinetic - (0.5 * m * v0.lengthSq());
  particle.currentEnergy = {
    kinetic,
    potential,
    total,
  };

  // Append trail
  particle.trail.unshift(particle.pos.clone());
  if (particle.trail.length > particle.maxTrail) {
    particle.trail.pop();
  }
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
