export type Flux85Scenario =
  | 'uniform_open'
  | 'nonuniform_integral'
  | 'closed_cube'
  | 'closed_curved';

export type OpenSurfaceShape = 'rectangle' | 'circle';
export type NonuniformProfile = 'linear_y' | 'quadratic_y' | 'sine_y';
export type CubeFieldMode = 'uniform' | 'linear_x';
export type CurvedSurfaceType = 'cylinder' | 'sphere';
export type CurvedFieldMode = 'uniform' | 'radial_source';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Flux85Params {
  scenario: Flux85Scenario;
  /** Base electric field magnitude E₀ in kN/C (can be signed for radial source) */
  fieldStrength: number;
  /** Tilt angle θ (degrees, 0..180) between E and area normal A in uniform_open, or yaw rotation for cube */
  angleDeg: number;
  /** Open surface area A in m² (uniform_open) */
  areaM2: number;
  /** Open surface shape */
  openShape: OpenSurfaceShape;
  /** Nonuniform profile type (nonuniform_integral) */
  nonuniformProfile: NonuniformProfile;
  /** Spatial gradient β in kN/(C·m) for nonuniform_integral or closed_cube linear_x */
  gradientBeta: number;
  /** Grid subdivision N (N × N patches for surface integral) */
  gridN: number;
  /** Highlighted differential patch sweep 0..1 */
  patchSweep: number;
  /** Cube side length s in m (closed_cube) */
  cubeSide: number;
  /** Cube field mode */
  cubeFieldMode: CubeFieldMode;
  /** Closed curved surface geometry */
  curvedType: CurvedSurfaceType;
  /** Closed curved field mode */
  curvedFieldMode: CurvedFieldMode;
  /** Curved surface radius R in m */
  curvedRadius: number;
  /** Curved cylinder length L in m */
  curvedLength: number;
  /** Polarity (+1 or -1) for radial source in closed_curved */
  radialPolarity: 1 | -1;
}

export interface SurfacePatch85 {
  index: number;
  center: Vec3;
  normal: Vec3;
  dA: number; // m²
  eVec: Vec3; // kN/C
  dFlux: number; // kN·m²/C
  cosTheta: number;
}

export interface FaceFluxBreakdown {
  id: string;
  label: string;
  outwardNormal: Vec3;
  normalLabel: string;
  areaM2: number;
  avgFieldKN: number;
  angleDeg: number;
  fluxKNm2C: number;
  sign: 'positive' | 'negative' | 'zero';
}

export interface Flux85Evaluation {
  scenario: Flux85Scenario;
  /** Exact analytical electric flux Φ_E in kN·m²/C */
  exactFlux: number;
  /** Discrete surface-integral sum Σ E_i · ΔA_i in kN·m²/C */
  discreteFlux: number;
  /** Percent difference between discrete sum and exact integral */
  errorPercent: number;
  /** Total surface area (m²) */
  totalAreaM2: number;
  /** Effective projected area A_⊥ = A |cos θ| (meaningful for uniform_open) */
  projectedAreaM2: number;
  /** Flux sign classification (8.5.A.2.ii) */
  fluxSign: 'positive' | 'negative' | 'zero';
  /** Outward/normal area vector for primary open surface */
  primaryNormal: Vec3;
  /** Reference field vector at center */
  primaryField: Vec3;
  /** Discrete patches for surface integral visualization */
  patches: SurfacePatch85[];
  /** Highlighted differential patch dA */
  highlightedPatch: SurfacePatch85 | null;
  /** Face-by-face breakdown for closed surfaces (or open surface single face) */
  faces: FaceFluxBreakdown[];
  /** Incoming (negative) flux magnitude sum and outgoing (positive) flux magnitude sum */
  inFluxMag: number;
  outFluxMag: number;
  headline: string;
  ekSummary: string;
}

export interface FluxGraphLayout {
  width: number;
  height: number;
  mode: 'cosine_angle' | 'profile_y' | 'face_bars';
  title: string;
  xLabel: string;
  yLabel: string;
  yMin: number;
  yMax: number;
  zeroY: number;
  exactPath: string;
  discretePath?: string;
  markerX: number;
  markerY: number;
  bars: {
    label: string;
    value: number;
    x: number;
    y: number;
    w: number;
    h: number;
    sign: 'positive' | 'negative' | 'zero';
  }[];
}

export interface FluxDerivationStep {
  stepNumber: number;
  title: string;
  symbolic: string;
  liveSubstitution: string;
  ekRef: string;
}

export interface Flux85Claim {
  id: string;
  ekRef: string;
  skill: '3.B' | '2.C';
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  justification: string;
}

export interface FluxComparisonRecord {
  id: string;
  scenario: Flux85Scenario;
  label: string;
  exactFlux: number;
  areaM2: number;
  sign: 'positive' | 'negative' | 'zero';
  notes: string;
}

export function createDefaultFlux85Params(
  scenario: Flux85Scenario = 'uniform_open'
): Flux85Params {
  switch (scenario) {
    case 'uniform_open':
      return {
        scenario: 'uniform_open',
        fieldStrength: 6.0,
        angleDeg: 35,
        areaM2: 2.0,
        openShape: 'rectangle',
        nonuniformProfile: 'linear_y',
        gradientBeta: 3.0,
        gridN: 6,
        patchSweep: 0.35,
        cubeSide: 1.8,
        cubeFieldMode: 'uniform',
        curvedType: 'sphere',
        curvedFieldMode: 'radial_source',
        curvedRadius: 1.35,
        curvedLength: 2.4,
        radialPolarity: 1,
      };
    case 'nonuniform_integral':
      return {
        scenario: 'nonuniform_integral',
        fieldStrength: 2.0,
        angleDeg: 0,
        areaM2: 4.0, // 2m x 2m surface
        openShape: 'rectangle',
        nonuniformProfile: 'linear_y',
        gradientBeta: 4.0,
        gridN: 6,
        patchSweep: 0.42,
        cubeSide: 1.8,
        cubeFieldMode: 'uniform',
        curvedType: 'sphere',
        curvedFieldMode: 'radial_source',
        curvedRadius: 1.35,
        curvedLength: 2.4,
        radialPolarity: 1,
      };
    case 'closed_cube':
      return {
        scenario: 'closed_cube',
        fieldStrength: 5.0,
        angleDeg: 0,
        areaM2: 3.24,
        openShape: 'rectangle',
        nonuniformProfile: 'linear_y',
        gradientBeta: 3.0,
        gridN: 6,
        patchSweep: 0.25,
        cubeSide: 1.8,
        cubeFieldMode: 'uniform',
        curvedType: 'sphere',
        curvedFieldMode: 'radial_source',
        curvedRadius: 1.35,
        curvedLength: 2.4,
        radialPolarity: 1,
      };
    case 'closed_curved':
      return {
        scenario: 'closed_curved',
        fieldStrength: 4.0,
        angleDeg: 0,
        areaM2: 4.0,
        openShape: 'circle',
        nonuniformProfile: 'linear_y',
        gradientBeta: 3.0,
        gridN: 6,
        patchSweep: 0.25,
        cubeSide: 1.8,
        cubeFieldMode: 'uniform',
        curvedType: 'sphere',
        curvedFieldMode: 'radial_source',
        curvedRadius: 1.35,
        curvedLength: 2.4,
        radialPolarity: 1,
      };
  }
}

function cleanZero(val: number, eps = 1e-6): number {
  return Math.abs(val) < eps ? 0 : val;
}

function classifySign(val: number, eps = 1e-3): 'positive' | 'negative' | 'zero' {
  if (val > eps) return 'positive';
  if (val < -eps) return 'negative';
  return 'zero';
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Evaluates spatially varying E_x(y) for nonuniform_integral scenario (y ∈ [0, H]). */
export function evaluateNonuniformFieldX(
  y: number,
  heightH: number,
  params: Flux85Params
): number {
  const E0 = params.fieldStrength;
  const beta = params.gradientBeta;
  switch (params.nonuniformProfile) {
    case 'linear_y':
      return E0 + beta * y;
    case 'quadratic_y':
      return beta * y * y;
    case 'sine_y':
      return E0 * Math.sin((Math.PI * y) / Math.max(0.2, heightH));
  }
}

/**
 * Core pure evaluator for AP Physics C Topic 8.5: Electric Flux.
 */
export function evaluateFlux85(params: Flux85Params): Flux85Evaluation {
  if (params.scenario === 'uniform_open') {
    const thetaRad = (params.angleDeg * Math.PI) / 180;
    const cosTheta = cleanZero(Math.cos(thetaRad), 1e-6);
    const sinTheta = cleanZero(Math.sin(thetaRad), 1e-6);
    const E0 = params.fieldStrength;
    const A = Math.max(0.25, params.areaM2);
    const exactFlux = cleanZero(E0 * A * cosTheta, 1e-5);
    const projectedAreaM2 = Math.abs(A * cosTheta);
    const fluxSign = classifySign(exactFlux);

    // E points along +x; area normal A rotates in x-y plane by theta from +x
    const primaryField: Vec3 = { x: E0, y: 0, z: 0 };
    const primaryNormal: Vec3 = { x: cosTheta, y: sinTheta, z: 0 };

    const faces: FaceFluxBreakdown[] = [
      {
        id: 'open-surface',
        label: params.openShape === 'circle' ? 'Circular Disk' : 'Planar Loop',
        outwardNormal: primaryNormal,
        normalLabel: `n̂ (θ=${params.angleDeg.toFixed(0)}°)`,
        areaM2: A,
        avgFieldKN: E0,
        angleDeg: params.angleDeg,
        fluxKNm2C: exactFlux,
        sign: fluxSign,
      },
    ];

    const headline =
      fluxSign === 'positive'
        ? `Positive Flux (+${exactFlux.toFixed(2)} kN·m²/C) — E·A > 0 because θ = ${params.angleDeg.toFixed(0)}° < 90°`
        : fluxSign === 'negative'
        ? `Negative Flux (${exactFlux.toFixed(2)} kN·m²/C) — E·A < 0 because θ = ${params.angleDeg.toFixed(0)}° > 90°`
        : 'Zero Electric Flux (0.00 kN·m²/C) — Surface is parallel to E (A ⊥ E, cos 90° = 0)';

    return {
      scenario: 'uniform_open',
      exactFlux,
      discreteFlux: exactFlux,
      errorPercent: 0,
      totalAreaM2: A,
      projectedAreaM2,
      fluxSign,
      primaryNormal,
      primaryField,
      patches: [],
      highlightedPatch: null,
      faces,
      inFluxMag: exactFlux < 0 ? Math.abs(exactFlux) : 0,
      outFluxMag: exactFlux > 0 ? exactFlux : 0,
      headline,
      ekSummary:
        'EK 8.5.A.2: For constant E across planar area A, Φ_E = E · A = E A cos θ. Area vector A is perpendicular to the surface plane (8.5.A.2.i) and the dot product determines the sign of flux (8.5.A.2.ii).',
    };
  }

  if (params.scenario === 'nonuniform_integral') {
    // Square surface in y-z plane: y ∈ [0, H], z ∈ [-W/2, +W/2], normal n̂ = +î
    const H = Math.sqrt(Math.max(1.0, params.areaM2));
    const W = H;
    const totalAreaM2 = W * H;
    const N = Math.max(2, Math.min(12, Math.round(params.gridN)));
    const dy = H / N;
    const dz = W / N;
    const dA = dy * dz;

    let exactFlux = 0;
    if (params.nonuniformProfile === 'linear_y') {
      // ∫_0^H (E0 + β y) W dy = W (E0 H + 0.5 β H²)
      exactFlux = W * (params.fieldStrength * H + 0.5 * params.gradientBeta * H * H);
    } else if (params.nonuniformProfile === 'quadratic_y') {
      // ∫_0^H (β y²) W dy = (1/3) β W H³
      exactFlux = (params.gradientBeta * W * H * H * H) / 3;
    } else {
      // ∫_0^H E0 sin(π y / H) W dy = (2 / π) E0 W H
      exactFlux = (2 / Math.PI) * params.fieldStrength * W * H;
    }
    exactFlux = cleanZero(exactFlux, 1e-5);

    const patches: SurfacePatch85[] = [];
    let discreteFlux = 0;
    let idx = 0;
    for (let iy = 0; iy < N; iy++) {
      const yMid = (iy + 0.5) * dy;
      const eX = evaluateNonuniformFieldX(yMid, H, params);
      for (let iz = 0; iz < N; iz++) {
        const zMid = -W / 2 + (iz + 0.5) * dz;
        const dFlux = eX * dA;
        discreteFlux += dFlux;
        patches.push({
          index: idx++,
          center: { x: 0, y: yMid - H / 2, z: zMid },
          normal: { x: 1, y: 0, z: 0 },
          dA,
          eVec: { x: eX, y: 0, z: 0 },
          dFlux,
          cosTheta: eX >= 0 ? 1 : -1,
        });
      }
    }
    discreteFlux = cleanZero(discreteFlux, 1e-5);

    const errorPercent =
      Math.abs(exactFlux) > 1e-5
        ? Number(((Math.abs(discreteFlux - exactFlux) / Math.abs(exactFlux)) * 100).toFixed(3))
        : 0;

    const clampedSweep = Math.max(0, Math.min(0.9999, params.patchSweep));
    const hiIdx = Math.floor(clampedSweep * patches.length);
    const highlightedPatch = patches[hiIdx] ?? null;

    const fluxSign = classifySign(exactFlux);
    const profileName =
      params.nonuniformProfile === 'linear_y'
        ? 'Linear E(y) = E₀ + βy'
        : params.nonuniformProfile === 'quadratic_y'
        ? 'Quadratic E(y) = βy²'
        : 'Sinusoidal E(y) = E₀ sin(πy/H)';

    return {
      scenario: 'nonuniform_integral',
      exactFlux,
      discreteFlux,
      errorPercent,
      totalAreaM2,
      projectedAreaM2: totalAreaM2,
      fluxSign,
      primaryNormal: { x: 1, y: 0, z: 0 },
      primaryField: { x: exactFlux / totalAreaM2, y: 0, z: 0 },
      patches,
      highlightedPatch,
      faces: [
        {
          id: 'nonuniform-plane',
          label: `Surface (${N}×${N} dA)`,
          outwardNormal: { x: 1, y: 0, z: 0 },
          normalLabel: '+î',
          areaM2: totalAreaM2,
          avgFieldKN: exactFlux / totalAreaM2,
          angleDeg: 0,
          fluxKNm2C: exactFlux,
          sign: fluxSign,
        },
      ],
      inFluxMag: exactFlux < 0 ? Math.abs(exactFlux) : 0,
      outFluxMag: exactFlux > 0 ? exactFlux : 0,
      headline: `Surface Integral ∫ E · dA (${profileName}) — Exact Φ = ${exactFlux.toFixed(2)} kN·m²/C (${N}×${N} grid err ${errorPercent.toFixed(2)}%)`,
      ekSummary:
        'EK 8.5.A.3: When E varies across a surface, Φ_E = ∫ E · dA sums differential flux elements dΦ = E(y)·dA over every patch.',
    };
  }

  if (params.scenario === 'closed_cube') {
    const s = Math.max(0.8, params.cubeSide);
    const faceArea = s * s;
    const totalAreaM2 = 6 * faceArea;
    const yawRad = (params.angleDeg * Math.PI) / 180;
    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    const E0 = params.fieldStrength;
    const beta = params.cubeFieldMode === 'linear_x' ? params.gradientBeta : 0;

    // Cube rotated around Y axis by yawRad; local axes expressed in world coordinates:
    const uX: Vec3 = { x: cosY, y: 0, z: -sinY };
    const uY: Vec3 = { x: 0, y: 1, z: 0 };
    const uZ: Vec3 = { x: sinY, y: 0, z: cosY };

    const faceSpecs: { id: string; label: string; n: Vec3; nLabel: string }[] = [
      { id: 'right', label: '+x′ Right Face', n: uX, nLabel: '+n̂₁' },
      {
        id: 'left',
        label: '−x′ Left Face',
        n: { x: -uX.x, y: -uX.y, z: -uX.z },
        nLabel: '−n̂₁',
      },
      { id: 'front', label: '+z′ Front Face', n: uZ, nLabel: '+n̂₃' },
      {
        id: 'back',
        label: '−z′ Back Face',
        n: { x: -uZ.x, y: -uZ.y, z: -uZ.z },
        nLabel: '−n̂₃',
      },
      { id: 'top', label: '+y Top Face', n: uY, nLabel: '+ĵ' },
      { id: 'bottom', label: '−y Bottom Face', n: { x: 0, y: -1, z: 0 }, nLabel: '−ĵ' },
    ];

    // Field E(x) = (E0 + beta * x) î.
    // Because E(x) is linear in x, the exact integral over any flat face equals E(x_center) · (faceArea * n̂)!
    const faces: FaceFluxBreakdown[] = faceSpecs.map(spec => {
      const centerX = (s / 2) * spec.n.x;
      const eAtCenterX = E0 + beta * centerX;
      const eVec: Vec3 = { x: eAtCenterX, y: 0, z: 0 };
      const flux = cleanZero(dot3(eVec, spec.n) * faceArea, 1e-5);
      const eMag = Math.abs(eAtCenterX);
      const cosAng = eMag > 1e-6 ? Math.max(-1, Math.min(1, dot3(eVec, spec.n) / eMag)) : 0;
      const angDeg = Number(((Math.acos(cosAng) * 180) / Math.PI).toFixed(0));
      return {
        id: spec.id,
        label: spec.label,
        outwardNormal: spec.n,
        normalLabel: spec.nLabel,
        areaM2: faceArea,
        avgFieldKN: eAtCenterX,
        angleDeg: angDeg,
        fluxKNm2C: flux,
        sign: classifySign(flux),
      };
    });

    const discreteFlux = cleanZero(
      faces.reduce((acc, f) => acc + f.fluxKNm2C, 0),
      1e-5
    );
    // Exact divergence theorem result: ∮ (E0 + βx)î · dA = β * Volume = β s³ (invariant under rotation!)
    const exactFlux = cleanZero(beta * s * s * s, 1e-5);
    const inFluxMag = faces.reduce((acc, f) => acc + (f.fluxKNm2C < 0 ? Math.abs(f.fluxKNm2C) : 0), 0);
    const outFluxMag = faces.reduce((acc, f) => acc + (f.fluxKNm2C > 0 ? f.fluxKNm2C : 0), 0);
    const fluxSign = classifySign(exactFlux);

    const headline =
      params.cubeFieldMode === 'uniform'
        ? `Closed Cube in Uniform Field — Entering (−${inFluxMag.toFixed(1)}) cancels Exiting (+${outFluxMag.toFixed(1)}) ⇒ Φ_net = 0.00 kN·m²/C`
        : `Closed Cube in Nonuniform E(x) = E₀ + βx — Net Outward Flux Φ_net = βs³ = ${exactFlux >= 0 ? '+' : ''}${exactFlux.toFixed(2)} kN·m²/C`;

    return {
      scenario: 'closed_cube',
      exactFlux,
      discreteFlux,
      errorPercent: 0,
      totalAreaM2,
      projectedAreaM2: faceArea,
      fluxSign,
      primaryNormal: uX,
      primaryField: { x: E0, y: 0, z: 0 },
      patches: [],
      highlightedPatch: null,
      faces,
      inFluxMag,
      outFluxMag,
      headline,
      ekSummary:
        'EK 8.5.A.2.i–ii: Every closed-surface area vector points OUTWARD. Flux entering a face is negative (E·n̂ < 0) and flux exiting is positive (E·n̂ > 0).',
    };
  }

  // Scenario 4: closed_curved (Closed Cylinder or Sphere)
  const R = Math.max(0.6, params.curvedRadius);
  const L = Math.max(1.0, params.curvedLength);
  const E0 = params.fieldStrength;

  if (params.curvedType === 'cylinder') {
    const capArea = Math.PI * R * R;
    const wallArea = 2 * Math.PI * R * L;
    const totalAreaM2 = 2 * capArea + wallArea;

    if (params.curvedFieldMode === 'uniform') {
      const rightFlux = cleanZero(E0 * capArea, 1e-5);
      const leftFlux = cleanZero(-E0 * capArea, 1e-5);
      const faces: FaceFluxBreakdown[] = [
        {
          id: 'cyl-right',
          label: 'Right End Cap (+î)',
          outwardNormal: { x: 1, y: 0, z: 0 },
          normalLabel: '+î',
          areaM2: capArea,
          avgFieldKN: E0,
          angleDeg: 0,
          fluxKNm2C: rightFlux,
          sign: classifySign(rightFlux),
        },
        {
          id: 'cyl-left',
          label: 'Left End Cap (−î)',
          outwardNormal: { x: -1, y: 0, z: 0 },
          normalLabel: '−î',
          areaM2: capArea,
          avgFieldKN: E0,
          angleDeg: 180,
          fluxKNm2C: leftFlux,
          sign: classifySign(leftFlux),
        },
        {
          id: 'cyl-wall',
          label: 'Curved Wall (r̂ ⊥ î)',
          outwardNormal: { x: 0, y: 1, z: 0 },
          normalLabel: 'r̂ (90°)',
          areaM2: wallArea,
          avgFieldKN: E0,
          angleDeg: 90,
          fluxKNm2C: 0,
          sign: 'zero',
        },
      ];

      return {
        scenario: 'closed_curved',
        exactFlux: 0,
        discreteFlux: 0,
        errorPercent: 0,
        totalAreaM2,
        projectedAreaM2: capArea,
        fluxSign: 'zero',
        primaryNormal: { x: 1, y: 0, z: 0 },
        primaryField: { x: E0, y: 0, z: 0 },
        patches: [],
        highlightedPatch: null,
        faces,
        inFluxMag: Math.abs(leftFlux),
        outFluxMag: Math.abs(rightFlux),
        headline: `Closed Cylinder in Uniform E — Curved Wall Φ = 0 (E ⊥ dA), Caps Cancel ⇒ Φ_net = 0.00 kN·m²/C`,
        ekSummary:
          'EK 8.5.A.3: Along the cylindrical wall, dA points radially outward (⊥ to axial E), contributing zero flux. End caps carry equal and opposite flux ±E₀πR².',
      };
    } else {
      // Radial cylindrical/line field E(r) = polarity * E0 * (R_ref / r) r̂ perpendicular to cylinder axis!
      const Rref = 1.0;
      const eAtWall = params.radialPolarity * E0 * (Rref / R);
      const wallFlux = cleanZero(eAtWall * wallArea, 1e-5);
      const fluxSign = classifySign(wallFlux);
      const faces: FaceFluxBreakdown[] = [
        {
          id: 'cyl-wall',
          label: 'Curved Wall (E ∥ r̂)',
          outwardNormal: { x: 0, y: 1, z: 0 },
          normalLabel: 'r̂',
          areaM2: wallArea,
          avgFieldKN: Math.abs(eAtWall),
          angleDeg: params.radialPolarity > 0 ? 0 : 180,
          fluxKNm2C: wallFlux,
          sign: fluxSign,
        },
        {
          id: 'cyl-right',
          label: 'Right End Cap (E ⊥ +î)',
          outwardNormal: { x: 1, y: 0, z: 0 },
          normalLabel: '+î',
          areaM2: capArea,
          avgFieldKN: Math.abs(eAtWall),
          angleDeg: 90,
          fluxKNm2C: 0,
          sign: 'zero',
        },
        {
          id: 'cyl-left',
          label: 'Left End Cap (E ⊥ −î)',
          outwardNormal: { x: -1, y: 0, z: 0 },
          normalLabel: '−î',
          areaM2: capArea,
          avgFieldKN: Math.abs(eAtWall),
          angleDeg: 90,
          fluxKNm2C: 0,
          sign: 'zero',
        },
      ];

      return {
        scenario: 'closed_curved',
        exactFlux: wallFlux,
        discreteFlux: wallFlux,
        errorPercent: 0,
        totalAreaM2,
        projectedAreaM2: wallArea,
        fluxSign,
        primaryNormal: { x: 0, y: 1, z: 0 },
        primaryField: { x: 0, y: eAtWall, z: 0 },
        patches: [],
        highlightedPatch: null,
        faces,
        inFluxMag: wallFlux < 0 ? Math.abs(wallFlux) : 0,
        outFluxMag: wallFlux > 0 ? wallFlux : 0,
        headline: `Closed Cylinder (Radial 1/r Field) — E(R) ∝ 1/R & A_wall ∝ R ⇒ Φ = ${wallFlux >= 0 ? '+' : ''}${wallFlux.toFixed(1)} kN·m²/C (Independent of R)`,
        ekSummary:
          'EK 8.5.A.3: For a radial cylindrical field E ∝ 1/r, E is parallel to the outward normal on the curved wall (E·dA = E dA) and perpendicular to both end caps.',
      };
    }
  } else {
    // Closed Sphere of radius R
    const sphereArea = 4 * Math.PI * R * R;
    const hemiCrossSection = Math.PI * R * R;

    if (params.curvedFieldMode === 'uniform') {
      const rightHemiFlux = cleanZero(E0 * hemiCrossSection, 1e-5);
      const leftHemiFlux = cleanZero(-E0 * hemiCrossSection, 1e-5);
      const faces: FaceFluxBreakdown[] = [
        {
          id: 'sph-right',
          label: 'Right Hemisphere (Exiting)',
          outwardNormal: { x: 1, y: 0, z: 0 },
          normalLabel: '+r̂_x',
          areaM2: sphereArea / 2,
          avgFieldKN: E0,
          angleDeg: 0,
          fluxKNm2C: rightHemiFlux,
          sign: 'positive',
        },
        {
          id: 'sph-left',
          label: 'Left Hemisphere (Entering)',
          outwardNormal: { x: -1, y: 0, z: 0 },
          normalLabel: '−r̂_x',
          areaM2: sphereArea / 2,
          avgFieldKN: E0,
          angleDeg: 180,
          fluxKNm2C: leftHemiFlux,
          sign: 'negative',
        },
      ];

      return {
        scenario: 'closed_curved',
        exactFlux: 0,
        discreteFlux: 0,
        errorPercent: 0,
        totalAreaM2: sphereArea,
        projectedAreaM2: hemiCrossSection,
        fluxSign: 'zero',
        primaryNormal: { x: 1, y: 0, z: 0 },
        primaryField: { x: E0, y: 0, z: 0 },
        patches: [],
        highlightedPatch: null,
        faces,
        inFluxMag: Math.abs(leftHemiFlux),
        outFluxMag: Math.abs(rightHemiFlux),
        headline: `Closed Sphere in Uniform E — Entering (−E₀πR²) Cancels Exiting (+E₀πR²) ⇒ Φ_net = 0.00 kN·m²/C`,
        ekSummary:
          'EK 8.5.A.3: Even on a curved sphere, ∫ E·dA over the right hemisphere equals +E₀πR² (projected disk area) and over the left hemisphere equals −E₀πR², summing to zero.',
      };
    } else {
      // Spherical radial inverse-square field E(r) = polarity * E0 * (R_ref² / r²) r̂
      const Rref = 1.0;
      const eAtR = params.radialPolarity * E0 * ((Rref * Rref) / (R * R));
      const exactFlux = cleanZero(eAtR * sphereArea, 1e-5); // strictly 4π E0 R_ref², independent of R!
      const fluxSign = classifySign(exactFlux);

      const faces: FaceFluxBreakdown[] = [
        {
          id: 'sph-all',
          label: `Full Sphere (R = ${R.toFixed(2)} m)`,
          outwardNormal: { x: 1, y: 0, z: 0 },
          normalLabel: 'r̂ everywhere',
          areaM2: sphereArea,
          avgFieldKN: Math.abs(eAtR),
          angleDeg: params.radialPolarity > 0 ? 0 : 180,
          fluxKNm2C: exactFlux,
          sign: fluxSign,
        },
      ];

      return {
        scenario: 'closed_curved',
        exactFlux,
        discreteFlux: exactFlux,
        errorPercent: 0,
        totalAreaM2: sphereArea,
        projectedAreaM2: sphereArea,
        fluxSign,
        primaryNormal: { x: 1, y: 0, z: 0 },
        primaryField: { x: eAtR, y: 0, z: 0 },
        patches: [],
        highlightedPatch: null,
        faces,
        inFluxMag: exactFlux < 0 ? Math.abs(exactFlux) : 0,
        outFluxMag: exactFlux > 0 ? exactFlux : 0,
        headline: `Closed Sphere (Radial 1/r² Field) — E ∝ 1/R² & A = 4πR² ⇒ Φ = ${exactFlux >= 0 ? '+' : ''}${exactFlux.toFixed(1)} kN·m²/C (Radius-Invariant!)`,
        ekSummary:
          'EK 8.5.A.3: Because E is uniform in magnitude and everywhere parallel (or antiparallel) to outward dA on a concentric sphere, Φ_E = ∫ E·dA = ±E(R)·4πR² stays strictly invariant as R changes.',
      };
    }
  }
}

/**
 * Generates bounded SVG graph / bar chart layouts for AP Physics C Skill 1.A.
 */
export function computeFluxGraphLayout(
  params: Flux85Params,
  ev: Flux85Evaluation,
  width = 316,
  height = 166
): FluxGraphLayout {
  const padL = 34;
  const padR = 14;
  const padT = 18;
  const padB = 26;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = Math.max(50, height - padT - padB);

  if (params.scenario === 'uniform_open') {
    const maxPhi = Math.max(2, Math.abs(params.fieldStrength * params.areaM2));
    const yMin = -maxPhi * 1.15;
    const yMax = maxPhi * 1.15;
    const mapX = (deg: number) => padL + (Math.max(0, Math.min(180, deg)) / 180) * plotW;
    const mapY = (v: number) => {
      const c = Math.max(yMin, Math.min(yMax, v));
      return padT + (1 - (c - yMin) / (yMax - yMin)) * plotH;
    };

    const pts: string[] = [];
    for (let i = 0; i <= 48; i++) {
      const deg = (i / 48) * 180;
      const phi = params.fieldStrength * params.areaM2 * Math.cos((deg * Math.PI) / 180);
      pts.push(`${i === 0 ? 'M' : 'L'} ${mapX(deg).toFixed(1)} ${mapY(phi).toFixed(1)}`);
    }

    return {
      width,
      height,
      mode: 'cosine_angle',
      title: '1.A Chart: Φ_E(θ) = E A cos θ',
      xLabel: 'Tilt angle θ between E and A (°)',
      yLabel: 'Φ_E (kN·m²/C)',
      yMin,
      yMax,
      zeroY: mapY(0),
      exactPath: pts.join(' '),
      markerX: mapX(params.angleDeg),
      markerY: mapY(ev.exactFlux),
      bars: [],
    };
  }

  if (params.scenario === 'nonuniform_integral') {
    const H = Math.sqrt(Math.max(1.0, params.areaM2));
    const samples: { y: number; e: number }[] = [];
    for (let i = 0; i <= 40; i++) {
      const y = (i / 40) * H;
      samples.push({ y, e: evaluateNonuniformFieldX(y, H, params) });
    }
    const maxAbs = Math.max(2, ...samples.map(s => Math.abs(s.e)));
    const yMin = Math.min(0, ...samples.map(s => s.e)) * 1.15;
    const yMax = Math.max(maxAbs * 1.15, 2);

    const mapX = (y: number) => padL + (Math.max(0, Math.min(H, y)) / H) * plotW;
    const mapY = (v: number) => {
      const c = Math.max(yMin, Math.min(yMax, v));
      return padT + (1 - (c - yMin) / (yMax - yMin)) * plotH;
    };

    const exactPath = samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'} ${mapX(s.y).toFixed(1)} ${mapY(s.e).toFixed(1)}`)
      .join(' ');

    // Step function representing discrete Riemann patches across y
    const N = Math.max(2, Math.min(12, Math.round(params.gridN)));
    const dy = H / N;
    const stepParts: string[] = [];
    for (let i = 0; i < N; i++) {
      const y0 = i * dy;
      const y1 = (i + 1) * dy;
      const eMid = evaluateNonuniformFieldX((y0 + y1) / 2, H, params);
      stepParts.push(
        `${i === 0 ? 'M' : 'L'} ${mapX(y0).toFixed(1)} ${mapY(eMid).toFixed(1)} L ${mapX(y1).toFixed(1)} ${mapY(eMid).toFixed(1)}`
      );
    }

    const hiY = ev.highlightedPatch ? ev.highlightedPatch.center.y + H / 2 : H / 2;
    const hiE = ev.highlightedPatch ? ev.highlightedPatch.eVec.x : evaluateNonuniformFieldX(H / 2, H, params);

    return {
      width,
      height,
      mode: 'profile_y',
      title: '1.A Profile: Local Field E_x(y) Across Surface',
      xLabel: `Height coordinate y (0 → ${H.toFixed(1)} m)`,
      yLabel: 'E_x (kN/C)',
      yMin,
      yMax,
      zeroY: mapY(0),
      exactPath,
      discretePath: stepParts.join(' '),
      markerX: mapX(hiY),
      markerY: mapY(hiE),
      bars: [],
    };
  }

  // Face-by-face flux bar chart for closed_cube and closed_curved
  const barItems = [
    ...ev.faces.map(f => ({
      label: f.id === 'right' ? '+x′' : f.id === 'left' ? '−x′' : f.id === 'front' ? '+z′' : f.id === 'back' ? '−z′' : f.id === 'top' ? '+y' : f.id === 'bottom' ? '−y' : f.label.split(' ')[0],
      value: f.fluxKNm2C,
      sign: f.sign,
    })),
    {
      label: 'Net Φ',
      value: ev.exactFlux,
      sign: ev.fluxSign,
    },
  ];

  const maxAbs = Math.max(4, ...barItems.map(b => Math.abs(b.value)));
  const yMin = -maxAbs * 1.18;
  const yMax = maxAbs * 1.18;
  const mapY = (v: number) => {
    const c = Math.max(yMin, Math.min(yMax, v));
    return padT + (1 - (c - yMin) / (yMax - yMin)) * plotH;
  };
  const zeroY = mapY(0);
  const slotW = plotW / barItems.length;
  const barW = Math.max(12, Math.min(34, slotW * 0.62));

  const bars = barItems.map((item, i) => {
    const cx = padL + (i + 0.5) * slotW;
    const yVal = mapY(item.value);
    const topY = Math.min(zeroY, yVal);
    const h = Math.max(2, Math.abs(yVal - zeroY));
    return {
      label: item.label,
      value: item.value,
      x: cx - barW / 2,
      y: topY,
      w: barW,
      h,
      sign: item.sign,
    };
  });

  return {
    width,
    height,
    mode: 'face_bars',
    title: '1.A Face-by-Face & Net Closed Flux Chart',
    xLabel: 'Surface Faces & Total ∮ E · dA',
    yLabel: 'Φ (kN·m²/C)',
    yMin,
    yMax,
    zeroY,
    exactPath: '',
    markerX: padL,
    markerY: zeroY,
    bars,
  };
}

/**
 * Generates AP Physics C Skill 2.A step-by-step symbolic derivations with live numbers.
 */
export function getFluxDerivationSteps85(
  params: Flux85Params,
  ev: Flux85Evaluation
): FluxDerivationStep[] {
  switch (params.scenario) {
    case 'uniform_open':
      return [
        {
          stepNumber: 1,
          title: 'Define Area Vector Perpendicular to Surface',
          symbolic: 'A = A n̂,   n̂ ⊥ plane of surface',
          liveSubstitution: `A = ${params.areaM2.toFixed(2)} m², n̂ tilted θ = ${params.angleDeg.toFixed(0)}° from +x̂`,
          ekRef: '8.5.A.2.i',
        },
        {
          stepNumber: 2,
          title: 'Apply Uniform-Field Dot Product',
          symbolic: 'Φ_E = E · A = |E| |A| cos θ',
          liveSubstitution: `E = ${params.fieldStrength.toFixed(1)} kN/C, cos(${params.angleDeg.toFixed(0)}°) = ${Math.cos((params.angleDeg * Math.PI) / 180).toFixed(3)}`,
          ekRef: '8.5.A.2',
        },
        {
          stepNumber: 3,
          title: 'Interpret Projected Area Cross-Section',
          symbolic: 'A_⊥ = A |cos θ|  (effective area facing field lines)',
          liveSubstitution: `Projected cross-section A_⊥ = ${ev.projectedAreaM2.toFixed(2)} m² out of ${params.areaM2.toFixed(2)} m²`,
          ekRef: '8.5.A.1',
        },
        {
          stepNumber: 4,
          title: 'Determine Sign of Flux from Angle θ',
          symbolic: '0° ≤ θ < 90° ⇒ Φ > 0;   θ = 90° ⇒ Φ = 0;   90° < θ ≤ 180° ⇒ Φ < 0',
          liveSubstitution: `Φ_E = ${ev.exactFlux >= 0 ? '+' : ''}${ev.exactFlux.toFixed(2)} kN·m²/C (${ev.fluxSign.toUpperCase()})`,
          ekRef: '8.5.A.2.ii',
        },
      ];

    case 'nonuniform_integral': {
      const H = Math.sqrt(Math.max(1.0, params.areaM2));
      const fieldExpr =
        params.nonuniformProfile === 'linear_y'
          ? 'E(y) = (E₀ + β y) î'
          : params.nonuniformProfile === 'quadratic_y'
          ? 'E(y) = (β y²) î'
          : 'E(y) = E₀ sin(π y / H) î';
      const closedForm =
        params.nonuniformProfile === 'linear_y'
          ? 'Φ_E = W ∫₀ᴴ (E₀ + βy) dy = W (E₀ H + ½ β H²)'
          : params.nonuniformProfile === 'quadratic_y'
          ? 'Φ_E = W ∫₀ᴴ β y² dy = (1/3) β W H³'
          : 'Φ_E = W ∫₀ᴴ E₀ sin(πy/H) dy = (2/π) E₀ W H';
      return [
        {
          stepNumber: 1,
          title: 'Subdivide Surface into Differential Elements dA',
          symbolic: 'dA = (dy dz) î   (or strip dA = W dy î since E depends only on y)',
          liveSubstitution: `H = W = ${H.toFixed(2)} m, Grid = ${params.gridN}×${params.gridN} (${params.gridN * params.gridN} patches)`,
          ekRef: '8.5.A.3',
        },
        {
          stepNumber: 2,
          title: 'Evaluate Local Dot Product dΦ_E = E · dA',
          symbolic: `${fieldExpr}  ⇒  dΦ_E = E_x(y) W dy`,
          liveSubstitution: ev.highlightedPatch
            ? `Patch #${ev.highlightedPatch.index + 1}: E_x = ${ev.highlightedPatch.eVec.x.toFixed(2)} kN/C, dΦ = ${ev.highlightedPatch.dFlux.toFixed(3)} kN·m²/C`
            : 'All patches aligned with +î',
          ekRef: '8.5.A.3',
        },
        {
          stepNumber: 3,
          title: 'Integrate Over Surface Domain [0, H]',
          symbolic: closedForm,
          liveSubstitution: `Exact ∫ = ${ev.exactFlux.toFixed(2)} kN·m²/C`,
          ekRef: '8.5.A.3',
        },
        {
          stepNumber: 4,
          title: 'Compare Discrete Riemann Sum to Exact Integral',
          symbolic: 'lim_(N→∞) Σ E_i · ΔA_i = ∫ E · dA',
          liveSubstitution: `Discrete sum = ${ev.discreteFlux.toFixed(2)} kN·m²/C (Error = ${ev.errorPercent.toFixed(2)}%)`,
          ekRef: '2.A / 2.C',
        },
      ];
    }

    case 'closed_cube':
      return [
        {
          stepNumber: 1,
          title: 'Assign Outward Area Vectors to All 6 Faces',
          symbolic: 'A_k = s² n̂_k  (strictly outward from closed volume)',
          liveSubstitution: `Cube side s = ${params.cubeSide.toFixed(2)} m ⇒ each face A = ${(params.cubeSide * params.cubeSide).toFixed(2)} m²`,
          ekRef: '8.5.A.2.i',
        },
        {
          stepNumber: 2,
          title: 'Compute Flux Through Each Face via Dot Product',
          symbolic: 'Φ_k = E(x_k) · A_k   (entering < 0, grazing = 0, exiting > 0)',
          liveSubstitution: `Entering sum = −${ev.inFluxMag.toFixed(2)}, Exiting sum = +${ev.outFluxMag.toFixed(2)} kN·m²/C`,
          ekRef: '8.5.A.2.ii',
        },
        {
          stepNumber: 3,
          title: 'Sum Over Closed Surface (6 Faces)',
          symbolic:
            params.cubeFieldMode === 'uniform'
              ? 'Φ_net = Σ Φ_k = (+E₀ s²) + (−E₀ s²) + 0 + 0 + 0 + 0 = 0'
              : 'Φ_net = [E₀ + β(s/2)] s² − [E₀ − β(s/2)] s² = β s³',
          liveSubstitution: `Total closed flux Φ_net = ${ev.exactFlux >= 0 ? '+' : ''}${ev.exactFlux.toFixed(2)} kN·m²/C`,
          ekRef: '8.5.A.3',
        },
        {
          stepNumber: 4,
          title: 'Orientation Invariance Check',
          symbolic: 'Rotating cube changes individual face fluxes but leaves Φ_net invariant',
          liveSubstitution: `At yaw = ${params.angleDeg.toFixed(0)}°: Φ_net remains ${ev.exactFlux.toFixed(2)} kN·m²/C`,
          ekRef: '2.C / 8.5.A.3',
        },
      ];

    case 'closed_curved': {
      const isSph = params.curvedType === 'sphere';
      const isUniform = params.curvedFieldMode === 'uniform';
      return [
        {
          stepNumber: 1,
          title: 'Define Outward Differential Surface Area dA',
          symbolic: isSph
            ? 'dA = (R² sin θ dθ dφ) r̂   (outward everywhere on sphere)'
            : 'Wall: dA = (R dφ dx) r̂;   Caps: A_± = ±(π R²) î',
          liveSubstitution: `Total surface area A = ${ev.totalAreaM2.toFixed(2)} m² (R = ${params.curvedRadius.toFixed(2)} m)`,
          ekRef: '8.5.A.2.i',
        },
        {
          stepNumber: 2,
          title: 'Evaluate E · dA on Each Curved Region',
          symbolic: isUniform
            ? isSph
              ? 'Right hemisphere: +E₀ πR²;   Left hemisphere: −E₀ πR²'
              : 'Wall: E ⊥ r̂ ⇒ Φ_wall = 0;   Caps: ±E₀ πR²'
            : isSph
            ? 'E(R) = ±E₀ (R₀²/R²) r̂  ⇒  E · dA = ±E(R) dA (constant on sphere!)'
            : 'Wall: E(R) = ±E₀ (R₀/R) r̂ ∥ dA;   Caps: E ⊥ î ⇒ Φ_caps = 0',
          liveSubstitution: `Local surface |E(R)| = ${(ev.faces[0]?.avgFieldKN ?? params.fieldStrength).toFixed(2)} kN/C`,
          ekRef: '8.5.A.3',
        },
        {
          stepNumber: 3,
          title: 'Evaluate Closed Surface Integral ∮ E · dA',
          symbolic: isUniform
            ? 'Φ_net = (+E₀ πR²) + (−E₀ πR²) = 0'
            : isSph
            ? 'Φ_net = ±E(R) · (4πR²) = ±[E₀ R₀²/R²] · 4πR² = ±4π R₀² E₀'
            : 'Φ_net = ±E(R) · (2πRL) = ±[E₀ R₀/R] · 2πRL = ±2π R₀ L E₀',
          liveSubstitution: `Exact Φ_net = ${ev.exactFlux >= 0 ? '+' : ''}${ev.exactFlux.toFixed(2)} kN·m²/C`,
          ekRef: '8.5.A.3',
        },
        {
          stepNumber: 4,
          title: 'Geometric Scaling Insight',
          symbolic: isUniform
            ? 'Every field line entering a closed surface in uniform E also exits it'
            : isSph
            ? 'R² in A = 4πR² cancels 1/R² in E(R) ⇒ Φ is strictly independent of R!'
            : 'R in A_wall = 2πRL cancels 1/R in E(R) ⇒ Φ is independent of cylinder radius R!',
          liveSubstitution: `Adjust R slider — Φ_net stays ${ev.exactFlux.toFixed(2)} kN·m²/C`,
          ekRef: '2.A / 3.B',
        },
      ];
    }
  }
}

export const TOPIC_8_5_CLAIMS: Flux85Claim[] = [
  {
    id: 'claim-tilt-60',
    ekRef: '8.5.A.2 / 8.5.A.2.i',
    skill: '3.B',
    prompt:
      'A flat loop of area A is placed in a uniform field E. When the plane of the loop makes a 30° angle with E (so the normal vector A makes a 60° angle with E), what is the electric flux?',
    options: [
      { id: 'a', text: 'E A cos(30°) = 0.866 E A' },
      { id: 'b', text: 'E A cos(60°) = 0.500 E A' },
      { id: 'c', text: 'Zero, because the surface is tilted.' },
    ],
    correctOptionId: 'b',
    justification:
      'By EK 8.5.A.2.i, θ in Φ_E = E·A = EA cos θ is always the angle between E and the area vector A perpendicular to the plane (θ = 90° − 30° = 60°), giving cos(60°) = 0.5.',
  },
  {
    id: 'claim-closed-sign',
    ekRef: '8.5.A.2.i–ii',
    skill: '3.B',
    prompt:
      'Electric field lines pass straight into the left face of a closed cube and exit out the right face. What are the signs of the flux on the left and right faces?',
    options: [
      { id: 'a', text: 'Left face is negative (E·A < 0); right face is positive (E·A > 0).' },
      { id: 'b', text: 'Both faces have positive flux because field lines pass through both.' },
      { id: 'c', text: 'Left face is positive; right face is negative.' },
    ],
    correctOptionId: 'a',
    justification:
      'For any closed surface (8.5.A.2.i), area vectors point strictly OUTWARD. On the left face, outward n̂ points opposite to E (θ = 180°, cos 180° = −1 ⇒ Φ < 0); on the right face, n̂ aligns with E (θ = 0° ⇒ Φ > 0).',
  },
  {
    id: 'claim-cube-gradient',
    ekRef: '8.5.A.3',
    skill: '2.C',
    prompt:
      'A closed cube of side s is centered at the origin in a spatially increasing field E(x) = (E₀ + βx) î (with β > 0). What is the net electric flux through the cube?',
    options: [
      { id: 'a', text: 'Zero, because the cube is closed and has no curved faces.' },
      { id: 'b', text: '2 E₀ s², because both x-faces add together.' },
      { id: 'c', text: 'Positive net flux Φ_net = β s³, because the exiting field on +x is stronger than the entering field on −x.' },
    ],
    correctOptionId: 'c',
    justification:
      'Right face flux is +(E₀ + βs/2)s² and left face flux is −(E₀ − βs/2)s². Side faces contribute 0. Summing gives Φ_net = βs³ > 0, independent of E₀.',
  },
  {
    id: 'claim-sphere-radius',
    ekRef: '8.5.A.3',
    skill: '3.B',
    prompt:
      'A sphere of radius R surrounds a centered radial inverse-square field E(r) = (C / r²) r̂. If the sphere radius is doubled to 2R, how does the total electric flux ∮ E·dA change?',
    options: [
      { id: 'a', text: 'It becomes 1/4 as large because E decreases as 1/r².' },
      { id: 'b', text: 'It stays exactly the same because E scales as 1/R² while surface area scales as R².' },
      { id: 'c', text: 'It becomes 4 times larger because surface area quadruples.' },
    ],
    correctOptionId: 'b',
    justification:
      'On a concentric sphere, E ∥ dA everywhere, so Φ_E = E(R)·(4πR²) = (C/R²)(4πR²) = 4πC. The R² factors cancel identically, making total flux radius-invariant.',
  },
];
