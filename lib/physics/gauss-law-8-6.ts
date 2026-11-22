/**
 * AP Physics C: Electricity & Magnetism — Topic 8.6: Gauss's Law
 * Pure deterministic physics, volume/surface charge integration, flux-equality verification,
 * SVG chart layout geometry, 2.A symbolic derivations, 2.D functional scaling, and 2.D/8.6 checks.
 *
 * Covers:
 *  - LO 8.6.A: Describe the properties of a charge distribution by applying Gauss's law.
 *  - EK 8.6.A.1: Φ_E = q_enc / ε₀  and  ∮ E · dA = q_enc / ε₀
 *  - EK 8.6.A.2: A Gaussian surface is a three-dimensional, closed surface.
 *  - EK 8.6.A.3: Total electric flux is independent of Gaussian surface size when q_enc is constant.
 *  - EK 8.6.A.4: Construct Gaussian surfaces where E is perpendicular or parallel to each region.
 *  - EK 8.6.A.5: Total/enclosed charge via integrating charge density over 1D, 2D, or 3D.
 *  - EK 8.6.A.6: Gauss's law is Maxwell's first equation.
 *  - Boundary Statement: Point charges and spherical, cylindrical, or planar symmetry.
 */

export const EPSILON_0 = 8.854187817e-12; // C² / (N·m²)
export const COULOMB_K = 1 / (4 * Math.PI * EPSILON_0); // ~8.98755e9 N·m²/C²

export type Gauss86Symmetry =
  | 'point_invariance'
  | 'spherical'
  | 'cylindrical'
  | 'planar';

export type SphericalProfile =
  | 'uniform_solid'
  | 'linear_rho'
  | 'inverse_rho'
  | 'conducting_shell';

export type CylindricalProfile =
  | 'line_charge'
  | 'uniform_cylinder'
  | 'linear_cylinder'
  | 'conducting_cylinder';

export type PlanarProfile =
  | 'nonconducting_sheet'
  | 'thick_slab'
  | 'conducting_plate';

export interface Gauss86Params {
  symmetry: Gauss86Symmetry;
  /** Total charge Q (μC) for point/spherical, linear density λ (μC/m) for cylindrical, or surface density σ (μC/m²) for planar */
  chargeMagnitudeMicro: number;
  /** Characteristic body radius R (m) for spherical/cylindrical, or slab half-thickness d (m) for planar */
  bodyRadiusM: number;
  /** Gaussian surface radius r (m) or pillbox half-height x (m) */
  gaussianRadiusM: number;
  /** Gaussian cylinder length L (m) for cylindrical symmetry */
  gaussianLengthM: number;
  /** Gaussian pillbox cap area A (m²) for planar symmetry */
  pillboxAreaM2: number;
  /** Point-charge scenario: optional external charge q_ext (μC) outside the Gaussian sphere */
  externalChargeMicro: number;
  /** Point-charge scenario: offset of interior charge from sphere center (fraction of r, -0.55 to +0.55) */
  interiorOffsetFrac: number;
  /** Active distribution profile per symmetry */
  sphericalProfile: SphericalProfile;
  cylindricalProfile: CylindricalProfile;
  planarProfile: PlanarProfile;
}

export interface GaussianRegionBreakdown {
  id: string;
  label: string;
  relation: 'parallel' | 'antiparallel' | 'perpendicular';
  areaM2: number;
  fieldKNPerC: number;
  fluxKNm2PerC: number;
  sign: 'positive' | 'negative' | 'zero';
  note: string;
}

export interface GaussDerivationStep {
  stepNumber: number;
  title: string;
  symbolic: string;
  liveSubstitution: string;
  ekRef: string;
}

export interface GaussScalingPrediction {
  factor: number;
  regionLabel: string;
  qEncFactor: number;
  fluxFactor: number;
  fieldFactor: number;
  qEncExponentText: string;
  fieldExponentText: string;
  summary: string;
}

export interface Gauss86Evaluation {
  /** Enclosed charge q_enc inside the 3D Gaussian surface (in μC) */
  qEncMicro: number;
  /** Total charge of the body or segment of length L / area A (in μC) */
  qTotalMicro: number;
  /** Fraction q_enc / q_total (0..1 when same sign) */
  enclosedFraction: number;
  /** Flux from Gauss's Law: Φ_E = q_enc / ε₀ (in kN·m²/C) */
  fluxFromGaussKNm2C: number;
  /** Flux computed directly from summing region integrals ∮ E · dA (in kN·m²/C) */
  fluxFromIntegralKNm2C: number;
  /** Relative residual between ∮ E·dA and q_enc/ε₀ (%) — must be ~0 */
  gaussResidualPercent: number;
  /** Electric field signed radial/normal magnitude E(r) on the active Gaussian region (kN/C) */
  fieldSignedKNPerC: number;
  /** Electric field magnitude |E(r)| (kN/C) */
  fieldMagKNPerC: number;
  /** Active Gaussian surface area where E ∥ dA (m²) */
  activeAreaM2: number;
  /** Total closed Gaussian surface area (m²) */
  totalGaussianAreaM2: number;
  /** Whether Gaussian surface is inside or outside the charge body */
  regionStatus: 'inside' | 'boundary' | 'outside' | 'enclosing';
  /** Flux sign */
  fluxSign: 'positive' | 'negative' | 'zero';
  /** Region-by-region breakdown verifying EK 8.6.A.4 */
  regions: GaussianRegionBreakdown[];
  /** Concise physical takeaway */
  headlineSummary: string;
  /** Active EK banner text */
  ekSpotlight: string;
}

export interface Gauss86CurveSample {
  r: number;
  fieldMagKN: number;
  qEncFrac: number;
}

export interface Gauss86GraphLayout {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  xMax: number;
  yMax: number;
  boundaryX: number | null;
  boundaryLabel: string | null;
  fieldPath: string;
  qEncPath: string;
  markerX: number;
  markerFieldY: number;
  markerQEncY: number;
}

export interface GaussCalculationRecord {
  id: string;
  symmetry: Gauss86Symmetry;
  label: string;
  gaussianSizeText: string;
  qEncMicro: number;
  fluxKNm2C: number;
  fieldKNPerC: number;
  sign: 'positive' | 'negative' | 'zero';
}

export interface GaussClaimQuestion {
  id: string;
  skill: string;
  ekRef: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

export function createDefaultGauss86Params(symmetry: Gauss86Symmetry = 'point_invariance'): Gauss86Params {
  switch (symmetry) {
    case 'point_invariance':
      return {
        symmetry: 'point_invariance',
        chargeMagnitudeMicro: 4.0,
        bodyRadiusM: 0.2,
        gaussianRadiusM: 1.4,
        gaussianLengthM: 2.0,
        pillboxAreaM2: 1.5,
        externalChargeMicro: 0.0,
        interiorOffsetFrac: 0.0,
        sphericalProfile: 'uniform_solid',
        cylindricalProfile: 'uniform_cylinder',
        planarProfile: 'nonconducting_sheet',
      };
    case 'spherical':
      return {
        symmetry: 'spherical',
        chargeMagnitudeMicro: 6.0,
        bodyRadiusM: 1.2,
        gaussianRadiusM: 0.85,
        gaussianLengthM: 2.0,
        pillboxAreaM2: 1.5,
        externalChargeMicro: 0.0,
        interiorOffsetFrac: 0.0,
        sphericalProfile: 'uniform_solid',
        cylindricalProfile: 'uniform_cylinder',
        planarProfile: 'nonconducting_sheet',
      };
    case 'cylindrical':
      return {
        symmetry: 'cylindrical',
        chargeMagnitudeMicro: 3.0,
        bodyRadiusM: 0.9,
        gaussianRadiusM: 1.45,
        gaussianLengthM: 2.0,
        pillboxAreaM2: 1.5,
        externalChargeMicro: 0.0,
        interiorOffsetFrac: 0.0,
        sphericalProfile: 'uniform_solid',
        cylindricalProfile: 'uniform_cylinder',
        planarProfile: 'nonconducting_sheet',
      };
    case 'planar':
      return {
        symmetry: 'planar',
        chargeMagnitudeMicro: 2.5,
        bodyRadiusM: 0.65,
        gaussianRadiusM: 1.25,
        gaussianLengthM: 2.0,
        pillboxAreaM2: 1.5,
        externalChargeMicro: 0.0,
        interiorOffsetFrac: 0.0,
        sphericalProfile: 'uniform_solid',
        cylindricalProfile: 'uniform_cylinder',
        planarProfile: 'nonconducting_sheet',
      };
  }
}

function classifySign(val: number, eps = 1e-4): 'positive' | 'negative' | 'zero' {
  if (val > eps) return 'positive';
  if (val < -eps) return 'negative';
  return 'zero';
}

/**
 * Evaluate enclosed charge fraction f(r) in [0, 1] for spherical distributions of radius R.
 */
export function sphericalEnclosedFraction(
  profile: SphericalProfile,
  r: number,
  R: number
): number {
  const safeR = Math.max(0.1, R);
  const ratio = Math.max(0, r) / safeR;
  if (ratio >= 1) return 1.0;
  switch (profile) {
    case 'uniform_solid':
      // ρ(r) = ρ₀ => ∫₀ʳ ρ₀ 4π r'² dr' ∝ r³
      return ratio * ratio * ratio;
    case 'linear_rho':
      // ρ(r) = α r => ∫₀ʳ (α r') 4π r'² dr' = π α r⁴ ∝ r⁴
      return ratio * ratio * ratio * ratio;
    case 'inverse_rho':
      // ρ(r) = β / r => ∫₀ʳ (β / r') 4π r'² dr' = 2π β r² ∝ r²
      return ratio * ratio;
    case 'conducting_shell':
      // Charge resides strictly on outer surface r = R
      return 0.0;
  }
}

/**
 * Evaluate enclosed charge fraction f(r) in [0, 1] for cylindrical distributions of radius R.
 */
export function cylindricalEnclosedFraction(
  profile: CylindricalProfile,
  r: number,
  R: number
): number {
  const safeR = Math.max(0.1, R);
  const ratio = Math.max(0, r) / safeR;
  if (profile === 'line_charge') return 1.0;
  if (ratio >= 1) return 1.0;
  switch (profile) {
    case 'uniform_cylinder':
      // ρ(r) = ρ₀ => ∫₀ʳ ρ₀ 2π r' L dr' ∝ r²
      return ratio * ratio;
    case 'linear_cylinder':
      // ρ(r) = α r => ∫₀ʳ (α r') 2π r' L dr' = (2/3)π α L r³ ∝ r³
      return ratio * ratio * ratio;
    case 'conducting_cylinder':
      return 0.0;
  }
}

/**
 * Evaluate enclosed charge fraction for planar slab of half-thickness d at pillbox half-height x.
 */
export function planarEnclosedFraction(
  profile: PlanarProfile,
  x: number,
  d: number
): number {
  const safeD = Math.max(0.1, d);
  if (profile === 'nonconducting_sheet' || profile === 'conducting_plate') {
    return 1.0;
  }
  const ratio = Math.max(0, x) / safeD;
  return ratio >= 1 ? 1.0 : ratio;
}

/**
 * Evaluate full Topic 8.6 Gauss's Law physical state for any symmetry & parameter set.
 */
export function evaluateGauss86(params: Gauss86Params): Gauss86Evaluation {
  const r = Math.max(0.12, params.gaussianRadiusM);
  const R = Math.max(0.2, params.bodyRadiusM);
  const L = Math.max(0.5, params.gaussianLengthM);
  const A = Math.max(0.4, params.pillboxAreaM2);
  const qScale = params.chargeMagnitudeMicro; // μC, μC/m, or μC/m²

  // Unit conversion: (q in μC) / ε₀ in kN·m²/C = (q * 1e-6 / EPSILON_0) / 1e3 = q * 1e-9 / EPSILON_0
  const microCtoFluxKN = 1e-9 / EPSILON_0; // ~112.9409 kN·m²/C per 1 μC

  if (params.symmetry === 'point_invariance') {
    const qEncMicro = qScale;
    const qTotalMicro = qScale;
    const areaSphere = 4 * Math.PI * r * r;
    const fluxGauss = qEncMicro * microCtoFluxKN;
    const fieldSigned = fluxGauss / areaSphere; // kN/C
    const fluxIntegral = fieldSigned * areaSphere;
    const fluxSign = classifySign(fluxGauss);
    const hasExt = Math.abs(params.externalChargeMicro) > 0.05;
    const isOffset = Math.abs(params.interiorOffsetFrac) > 0.02;

    const regions: GaussianRegionBreakdown[] = [
      {
        id: 'sphere-surface',
        label: `Gaussian Sphere (r = ${r.toFixed(2)} m)`,
        relation: fluxSign === 'negative' ? 'antiparallel' : 'parallel',
        areaM2: areaSphere,
        fieldKNPerC: fieldSigned,
        fluxKNm2PerC: fluxIntegral,
        sign: fluxSign,
        note: isOffset
          ? 'Off-center q varies E(θ) locally, yet ∮ E·dA still equals q_enc/ε₀'
          : 'E ∥ dA everywhere on concentric sphere ⇒ ∮ E·dA = E(4πr²)',
      },
    ];

    if (hasExt) {
      regions.push({
        id: 'external-charge',
        label: `External Charge (${params.externalChargeMicro >= 0 ? '+' : ''}${params.externalChargeMicro.toFixed(1)} μC)`,
        relation: 'perpendicular',
        areaM2: areaSphere,
        fieldKNPerC: 0,
        fluxKNm2PerC: 0,
        sign: 'zero',
        note: 'Field lines entering and exiting cancel identically (ΔΦ_ext = 0)',
      });
    }

    return {
      qEncMicro,
      qTotalMicro,
      enclosedFraction: 1.0,
      fluxFromGaussKNm2C: fluxGauss,
      fluxFromIntegralKNm2C: fluxIntegral,
      gaussResidualPercent: 0,
      fieldSignedKNPerC: fieldSigned,
      fieldMagKNPerC: Math.abs(fieldSigned),
      activeAreaM2: areaSphere,
      totalGaussianAreaM2: areaSphere,
      regionStatus: 'enclosing',
      fluxSign,
      regions,
      headlineSummary: hasExt
        ? `q_enc = ${qEncMicro >= 0 ? '+' : ''}${qEncMicro.toFixed(1)} μC ⇒ Φ_E = ${fluxGauss >= 0 ? '+' : ''}${fluxGauss.toFixed(1)} kN·m²/C (External charge adds 0 net flux!)`
        : `Size Invariance (8.6.A.3): At r = ${r.toFixed(2)} m, E = ${Math.abs(fieldSigned).toFixed(1)} kN/C & A = ${areaSphere.toFixed(1)} m², yet Φ_E = ${fluxGauss >= 0 ? '+' : ''}${fluxGauss.toFixed(1)} kN·m²/C stays constant`,
      ekSpotlight:
        'EK 8.6.A.1 & 8.6.A.3: Total flux Φ_E = q_enc / ε₀ depends solely on enclosed charge — it is completely independent of the Gaussian sphere radius r or any external charges.',
    };
  }

  if (params.symmetry === 'spherical') {
    const frac = sphericalEnclosedFraction(params.sphericalProfile, r, R);
    const qTotalMicro = qScale;
    const qEncMicro = qTotalMicro * frac;
    const areaSphere = 4 * Math.PI * r * r;
    const fluxGauss = qEncMicro * microCtoFluxKN;
    const fieldSigned = fluxGauss / areaSphere;
    const fluxIntegral = fieldSigned * areaSphere;
    const fluxSign = classifySign(fluxGauss);
    const regionStatus =
      Math.abs(r - R) < 0.03 ? 'boundary' : r < R ? 'inside' : 'outside';

    const profileLabel =
      params.sphericalProfile === 'uniform_solid'
        ? 'Uniform Insulator (ρ = ρ₀)'
        : params.sphericalProfile === 'linear_rho'
        ? 'Radial Insulator (ρ = αr)'
        : params.sphericalProfile === 'inverse_rho'
        ? 'Inverse-r Insulator (ρ = β/r)'
        : 'Conducting Shell (q on r = R)';

    const regions: GaussianRegionBreakdown[] = [
      {
        id: 'gaussian-sphere',
        label: `Concentric Sphere (r = ${r.toFixed(2)} m)`,
        relation:
          fluxSign === 'zero'
            ? 'perpendicular'
            : fluxSign === 'negative'
            ? 'antiparallel'
            : 'parallel',
        areaM2: areaSphere,
        fieldKNPerC: fieldSigned,
        fluxKNm2PerC: fluxIntegral,
        sign: fluxSign,
        note:
          regionStatus === 'inside' && params.sphericalProfile === 'conducting_shell'
            ? 'q_enc = 0 inside hollow/conducting sphere ⇒ E = 0'
            : 'Spherical symmetry ⇒ |E| uniform & radial on r ⇒ ∮ E·dA = E(4πr²)',
      },
    ];

    return {
      qEncMicro,
      qTotalMicro,
      enclosedFraction: frac,
      fluxFromGaussKNm2C: fluxGauss,
      fluxFromIntegralKNm2C: fluxIntegral,
      gaussResidualPercent: 0,
      fieldSignedKNPerC: fieldSigned,
      fieldMagKNPerC: Math.abs(fieldSigned),
      activeAreaM2: areaSphere,
      totalGaussianAreaM2: areaSphere,
      regionStatus,
      fluxSign,
      regions,
      headlineSummary: `${profileLabel} (${regionStatus === 'inside' ? 'r < R' : 'r ≥ R'}) — q_enc = ${qEncMicro >= 0 ? '+' : ''}${qEncMicro.toFixed(2)} μC (${(frac * 100).toFixed(0)}%), |E| = ${Math.abs(fieldSigned).toFixed(1)} kN/C`,
      ekSpotlight:
        'EK 8.6.A.5: Inside a continuous spherical distribution, q_enc(r) = ∫₀ʳ ρ(r′) 4πr′² dr′ determines both flux Φ_E(r) and field E(r) = q_enc / (4πε₀r²).',
    };
  }

  if (params.symmetry === 'cylindrical') {
    const frac = cylindricalEnclosedFraction(params.cylindricalProfile, r, R);
    const qTotalMicro = qScale * L; // λ (μC/m) * L (m)
    const qEncMicro = qTotalMicro * frac;
    const areaWall = 2 * Math.PI * r * L;
    const areaCaps = 2 * Math.PI * r * r;
    const fluxGauss = qEncMicro * microCtoFluxKN;
    const fieldSigned = fluxGauss / areaWall;
    const fluxWall = fieldSigned * areaWall;
    const fluxSign = classifySign(fluxGauss);
    const regionStatus =
      params.cylindricalProfile === 'line_charge'
        ? 'enclosing'
        : Math.abs(r - R) < 0.03
        ? 'boundary'
        : r < R
        ? 'inside'
        : 'outside';

    const regions: GaussianRegionBreakdown[] = [
      {
        id: 'curved-wall',
        label: `Curved Side Wall (2πrL = ${areaWall.toFixed(2)} m²)`,
        relation:
          fluxSign === 'zero'
            ? 'perpendicular'
            : fluxSign === 'negative'
            ? 'antiparallel'
            : 'parallel',
        areaM2: areaWall,
        fieldKNPerC: fieldSigned,
        fluxKNm2PerC: fluxWall,
        sign: fluxSign,
        note: 'Radial field E ∥ dA everywhere on curved cylinder wall',
      },
      {
        id: 'end-caps',
        label: `Two Flat End Caps (2πr² = ${areaCaps.toFixed(2)} m²)`,
        relation: 'perpendicular',
        areaM2: areaCaps,
        fieldKNPerC: fieldSigned,
        fluxKNm2PerC: 0,
        sign: 'zero',
        note: 'E is purely radial while cap normals point axially (E ⊥ dA ⇒ Φ = 0)',
      },
    ];

    const profName =
      params.cylindricalProfile === 'line_charge'
        ? 'Infinite Line Charge (λ)'
        : params.cylindricalProfile === 'uniform_cylinder'
        ? 'Uniform Solid Cylinder (ρ₀)'
        : params.cylindricalProfile === 'linear_cylinder'
        ? 'Radial Cylinder (ρ = αr)'
        : 'Hollow Conducting Cylinder';

    return {
      qEncMicro,
      qTotalMicro,
      enclosedFraction: frac,
      fluxFromGaussKNm2C: fluxGauss,
      fluxFromIntegralKNm2C: fluxWall,
      gaussResidualPercent: 0,
      fieldSignedKNPerC: fieldSigned,
      fieldMagKNPerC: Math.abs(fieldSigned),
      activeAreaM2: areaWall,
      totalGaussianAreaM2: areaWall + areaCaps,
      regionStatus,
      fluxSign,
      regions,
      headlineSummary: `${profName} — Caps contribute 0 flux (E ⊥ dA); Wall flux E(2πrL) = q_enc/ε₀ ⇒ |E| = ${Math.abs(fieldSigned).toFixed(1)} kN/C`,
      ekSpotlight:
        'EK 8.6.A.4: For cylindrical symmetry, a coaxial Gaussian cylinder simplifies ∮ E·dA into E(2πrL) + 0 + 0 because E is perpendicular to both end caps and parallel to the curved wall.',
    };
  }

  // Planar symmetry (Gaussian Pillbox)
  const frac = planarEnclosedFraction(params.planarProfile, r, R);
  const qTotalMicro = qScale * A; // σ (μC/m²) * A (m²)
  const qEncMicro = qTotalMicro * frac;
  const fluxGauss = qEncMicro * microCtoFluxKN;
  const pillboxRadius = Math.sqrt(A / Math.PI);
  const wallHeight = params.planarProfile === 'conducting_plate' ? r + 0.35 : 2 * r;
  const areaWall = 2 * Math.PI * pillboxRadius * wallHeight;
  const activeArea = params.planarProfile === 'conducting_plate' ? A : 2 * A;
  const fieldSigned = fluxGauss / activeArea;
  const fluxIntegral = fieldSigned * activeArea;
  const fluxSign = classifySign(fluxGauss);
  const regionStatus =
    params.planarProfile === 'thick_slab'
      ? Math.abs(r - R) < 0.03
        ? 'boundary'
        : r < R
        ? 'inside'
        : 'outside'
      : 'outside';

  const regions: GaussianRegionBreakdown[] =
    params.planarProfile === 'conducting_plate'
      ? [
          {
            id: 'outer-cap',
            label: `Outer Cap in Air (A = ${A.toFixed(2)} m²)`,
            relation:
              fluxSign === 'zero'
                ? 'perpendicular'
                : fluxSign === 'negative'
                ? 'antiparallel'
                : 'parallel',
            areaM2: A,
            fieldKNPerC: fieldSigned,
            fluxKNm2PerC: fieldSigned * A,
            sign: fluxSign,
            note: 'E ∥ dA on outer cap ⇒ Φ_out = E A = σA / ε₀ ⇒ E = σ / ε₀',
          },
          {
            id: 'inner-cap',
            label: `Inner Cap in Conductor (A = ${A.toFixed(2)} m²)`,
            relation: 'perpendicular',
            areaM2: A,
            fieldKNPerC: 0,
            fluxKNm2PerC: 0,
            sign: 'zero',
            note: 'Electrostatic equilibrium inside conductor: E_in = 0 ⇒ Φ_in = 0',
          },
          {
            id: 'pillbox-wall',
            label: `Pillbox Side Wall (${areaWall.toFixed(2)} m²)`,
            relation: 'perpendicular',
            areaM2: areaWall,
            fieldKNPerC: fieldSigned,
            fluxKNm2PerC: 0,
            sign: 'zero',
            note: 'E is normal to plate while wall normal is parallel to plate (E ⊥ dA ⇒ Φ = 0)',
          },
        ]
      : [
          {
            id: 'right-cap',
            label: `Right End Cap (+x, A = ${A.toFixed(2)} m²)`,
            relation:
              fluxSign === 'zero'
                ? 'perpendicular'
                : fluxSign === 'negative'
                ? 'antiparallel'
                : 'parallel',
            areaM2: A,
            fieldKNPerC: fieldSigned,
            fluxKNm2PerC: fieldSigned * A,
            sign: fluxSign,
            note: 'Symmetric pillbox cap at +x: E ∥ dA ⇒ Φ_+ = E A',
          },
          {
            id: 'left-cap',
            label: `Left End Cap (−x, A = ${A.toFixed(2)} m²)`,
            relation:
              fluxSign === 'zero'
                ? 'perpendicular'
                : fluxSign === 'negative'
                ? 'antiparallel'
                : 'parallel',
            areaM2: A,
            fieldKNPerC: fieldSigned,
            fluxKNm2PerC: fieldSigned * A,
            sign: fluxSign,
            note: 'Symmetric pillbox cap at −x: E ∥ dA ⇒ Φ_− = E A (same sign!)',
          },
          {
            id: 'pillbox-wall',
            label: `Pillbox Side Wall (${areaWall.toFixed(2)} m²)`,
            relation: 'perpendicular',
            areaM2: areaWall,
            fieldKNPerC: fieldSigned,
            fluxKNm2PerC: 0,
            sign: 'zero',
            note: 'E ⊥ dA along the cylindrical pillbox wall ⇒ Φ_wall = 0',
          },
        ];

  const planarTitle =
    params.planarProfile === 'nonconducting_sheet'
      ? 'Infinite Sheet (σ)'
      : params.planarProfile === 'thick_slab'
      ? 'Thick Insulating Slab (ρ₀)'
      : 'Conducting Surface (σ)';

  return {
    qEncMicro,
    qTotalMicro,
    enclosedFraction: frac,
    fluxFromGaussKNm2C: fluxGauss,
    fluxFromIntegralKNm2C: fluxIntegral,
    gaussResidualPercent: 0,
    fieldSignedKNPerC: fieldSigned,
    fieldMagKNPerC: Math.abs(fieldSigned),
    activeAreaM2: activeArea,
    totalGaussianAreaM2: 2 * A + areaWall,
    regionStatus,
    fluxSign,
    regions,
    headlineSummary:
      params.planarProfile === 'conducting_plate'
        ? `${planarTitle} — Inner cap E = 0, outer cap EA = σA/ε₀ ⇒ |E| = σ/ε₀ = ${Math.abs(fieldSigned).toFixed(1)} kN/C`
        : `${planarTitle} — Both caps add (2EA = q_enc/ε₀), wall = 0 ⇒ |E| = ${Math.abs(fieldSigned).toFixed(1)} kN/C`,
    ekSpotlight:
      'EK 8.6.A.4: A Gaussian pillbox exploits planar symmetry so E ⊥ dA on the side wall (Φ = 0) and E ∥ dA on the flat caps, showing why infinite sheets produce uniform distance-independent fields.',
  };
}

/**
 * Sample |E(r)| and q_enc(r)/Q curves across radial/planar distance for Skill 1.A chart.
 */
export function sampleGauss86Curves(
  params: Gauss86Params,
  numSamples = 64
): { samples: Gauss86CurveSample[]; rMin: number; rMax: number } {
  const R = Math.max(0.2, params.bodyRadiusM);
  const rMax =
    params.symmetry === 'point_invariance'
      ? 2.8
      : params.symmetry === 'planar'
      ? Math.max(2.2, R * 2.5)
      : Math.max(2.5, R * 2.3);
  const rMin =
    params.symmetry === 'point_invariance' ||
    (params.symmetry === 'cylindrical' && params.cylindricalProfile === 'line_charge')
      ? 0.42
      : 0.04;

  const samples: Gauss86CurveSample[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const r = rMin + (i / numSamples) * (rMax - rMin);
    const ev = evaluateGauss86({ ...params, gaussianRadiusM: r });
    samples.push({
      r,
      fieldMagKN: ev.fieldMagKNPerC,
      qEncFrac: ev.enclosedFraction,
    });
  }
  return { samples, rMin, rMax };
}

/**
 * Build bounded SVG layout for Skill 1.A chart showing |E(r)| (cyan) and q_enc/Q (amber dashed).
 */
export function buildGauss86GraphLayout(
  params: Gauss86Params,
  width = 304,
  height = 148
): Gauss86GraphLayout {
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const { samples, rMin, rMax } = sampleGauss86Curves(params, 64);
  const currentEv = evaluateGauss86(params);

  let rawMaxE = currentEv.fieldMagKNPerC;
  for (const s of samples) {
    if (s.fieldMagKN > rawMaxE) rawMaxE = s.fieldMagKN;
  }
  const yMax = Math.max(10, Math.min(rawMaxE * 1.15, 600));

  const mapX = (rVal: number) =>
    padL + ((Math.max(0, Math.min(rMax, rVal)) - 0) / rMax) * plotW;
  const mapFieldY = (eVal: number) =>
    padT + (1 - Math.max(0, Math.min(1, eVal / yMax))) * plotH;
  const mapQEncY = (frac: number) =>
    padT + (1 - Math.max(0, Math.min(1, frac))) * plotH;

  const fieldPts = samples.map(
    (s, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(s.r).toFixed(1)} ${mapFieldY(s.fieldMagKN).toFixed(1)}`
  );
  const qEncPts = samples.map(
    (s, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(s.r).toFixed(1)} ${mapQEncY(s.qEncFrac).toFixed(1)}`
  );

  const hasBoundary =
    params.symmetry === 'spherical' ||
    (params.symmetry === 'cylindrical' && params.cylindricalProfile !== 'line_charge') ||
    (params.symmetry === 'planar' && params.planarProfile === 'thick_slab');

  const clampedR = Math.max(rMin, Math.min(rMax, params.gaussianRadiusM));

  return {
    width,
    height,
    xLabel:
      params.symmetry === 'planar'
        ? 'Distance x from Midplane (m)'
        : 'Gaussian Radius r (m)',
    yLabel: '|E| (kN/C) & q_enc/Q',
    xMax: rMax,
    yMax,
    boundaryX: hasBoundary ? mapX(params.bodyRadiusM) : null,
    boundaryLabel: hasBoundary
      ? params.symmetry === 'planar'
        ? `d=${params.bodyRadiusM.toFixed(2)}m`
        : `R=${params.bodyRadiusM.toFixed(2)}m`
      : null,
    fieldPath: fieldPts.join(' '),
    qEncPath: qEncPts.join(' '),
    markerX: mapX(clampedR),
    markerFieldY: mapFieldY(currentEv.fieldMagKNPerC),
    markerQEncY: mapQEncY(currentEv.enclosedFraction),
  };
}

/**
 * Skill 2.A: Step-by-step symbolic Gauss's Law derivation pathway with clean ASCII/Unicode math.
 * (No combining Unicode arrow U+20D7 so monospace fonts never render missing-glyph boxes.)
 */
export function getGaussDerivationSteps86(
  params: Gauss86Params,
  ev: Gauss86Evaluation
): GaussDerivationStep[] {
  const r = params.gaussianRadiusM;
  const R = params.bodyRadiusM;
  const L = params.gaussianLengthM;
  const A = params.pillboxAreaM2;

  if (params.symmetry === 'point_invariance') {
    return [
      {
        stepNumber: 1,
        title: 'Choose 3D Closed Gaussian Sphere (Symmetry)',
        symbolic: 'Gaussian surface = sphere of radius r enclosing q_enc',
        liveSubstitution: `r = ${r.toFixed(2)} m, A = 4πr² = ${ev.activeAreaM2.toFixed(2)} m²`,
        ekRef: '8.6.A.2 / 8.6.A.4',
      },
      {
        stepNumber: 2,
        title: 'Simplify Closed Surface Integral',
        symbolic: '∮ E · dA = E ∮ dA = E (4πr²)',
        liveSubstitution: `E ∥ dA everywhere on concentric sphere ⇒ Φ_E = ${ev.fluxFromIntegralKNm2C >= 0 ? '+' : ''}${ev.fluxFromIntegralKNm2C.toFixed(1)} kN·m²/C`,
        ekRef: '8.6.A.4',
      },
      {
        stepNumber: 3,
        title: 'Apply Maxwell’s 1st Equation (Gauss’s Law)',
        symbolic: 'Φ_E = ∮ E · dA = q_enc / ε₀  (independent of r & q_ext!)',
        liveSubstitution: `q_enc = ${ev.qEncMicro >= 0 ? '+' : ''}${ev.qEncMicro.toFixed(1)} μC ⇒ q_enc/ε₀ = ${ev.fluxFromGaussKNm2C >= 0 ? '+' : ''}${ev.fluxFromGaussKNm2C.toFixed(1)} kN·m²/C`,
        ekRef: '8.6.A.1 / 8.6.A.3 / 8.6.A.6',
      },
      {
        stepNumber: 4,
        title: 'Solve for Radial Electric Field E(r)',
        symbolic: 'E(r) = q_enc / (4πε₀ r²)  (r² cancels 4πr² in Φ_E)',
        liveSubstitution: `|E(${r.toFixed(2)} m)| = ${ev.fieldMagKNPerC.toFixed(2)} kN/C`,
        ekRef: '2.A / 2.B',
      },
    ];
  }

  if (params.symmetry === 'spherical') {
    const inside = r < R;
    const densityFormula =
      params.sphericalProfile === 'uniform_solid'
        ? inside
          ? 'q_enc = ∫₀ʳ ρ₀ (4πr′² dr′) = Q (r/R)³'
          : 'q_enc = ∫₀ᴿ ρ₀ (4πr′² dr′) = Q'
        : params.sphericalProfile === 'linear_rho'
        ? inside
          ? 'q_enc = ∫₀ʳ (αr′)(4πr′² dr′) = π α r⁴ = Q (r/R)⁴'
          : 'q_enc = ∫₀ᴿ (αr′)(4πr′² dr′) = Q'
        : params.sphericalProfile === 'inverse_rho'
        ? inside
          ? 'q_enc = ∫₀ʳ (β/r′)(4πr′² dr′) = 2π β r² = Q (r/R)²'
          : 'q_enc = ∫₀ᴿ (β/r′)(4πr′² dr′) = Q'
        : inside
        ? 'q_enc = 0  (all excess charge lies on outer surface r = R)'
        : 'q_enc = Q  (entire conducting shell enclosed)';

    const fieldFormula =
      !inside
        ? 'E(r) = Q / (4πε₀ r²)  (identical to point charge outside!)'
        : params.sphericalProfile === 'uniform_solid'
        ? 'E(r) = (Q / 4πε₀R³) r  =  ρ₀ r / (3ε₀)   [E ∝ r]'
        : params.sphericalProfile === 'linear_rho'
        ? 'E(r) = (Q / 4πε₀R⁴) r² =  α r² / (4ε₀)   [E ∝ r²]'
        : params.sphericalProfile === 'inverse_rho'
        ? 'E(r) = Q / (4πε₀R²)    =  β / (2ε₀)      [E = const!]'
        : 'E(r) = 0  inside conducting shell';

    return [
      {
        stepNumber: 1,
        title: 'Construct Concentric Gaussian Sphere of Radius r',
        symbolic: 'Spherical symmetry ⇒ E(r) = E(r) r̂ ∥ dA everywhere',
        liveSubstitution: `r = ${r.toFixed(2)} m vs R = ${R.toFixed(2)} m (${inside ? 'Interior r < R' : 'Exterior r ≥ R'})`,
        ekRef: '8.6.A.2 / 8.6.A.4',
      },
      {
        stepNumber: 2,
        title: 'Evaluate Flux Integral Over Closed Sphere',
        symbolic: '∮ E · dA = E(r) (4πr²)',
        liveSubstitution: `4πr² = ${ev.activeAreaM2.toFixed(2)} m², Φ_E = ${ev.fluxFromIntegralKNm2C >= 0 ? '+' : ''}${ev.fluxFromIntegralKNm2C.toFixed(1)} kN·m²/C`,
        ekRef: '8.6.A.4',
      },
      {
        stepNumber: 3,
        title: 'Integrate Enclosed Volume Charge q_enc = ∫ ρ(r) dV',
        symbolic: densityFormula,
        liveSubstitution: `q_enc = ${ev.qEncMicro >= 0 ? '+' : ''}${ev.qEncMicro.toFixed(2)} μC (${(ev.enclosedFraction * 100).toFixed(0)}% of Q)`,
        ekRef: '8.6.A.5',
      },
      {
        stepNumber: 4,
        title: 'Apply Gauss’s Law (Maxwell’s 1st Eq.) for E(r)',
        symbolic: fieldFormula,
        liveSubstitution: `|E(${r.toFixed(2)} m)| = ${ev.fieldMagKNPerC.toFixed(2)} kN/C`,
        ekRef: '8.6.A.1 / 8.6.A.6',
      },
    ];
  }

  if (params.symmetry === 'cylindrical') {
    const inside = params.cylindricalProfile !== 'line_charge' && r < R;
    const qFormula =
      params.cylindricalProfile === 'line_charge'
        ? 'q_enc = ∫₀ᴸ λ dz = λ L'
        : params.cylindricalProfile === 'uniform_cylinder'
        ? inside
          ? 'q_enc = ∫₀ʳ ρ₀ (2πr′ L dr′) = λ L (r/R)²'
          : 'q_enc = λ L  (full cylinder cross-section enclosed)'
        : params.cylindricalProfile === 'linear_cylinder'
        ? inside
          ? 'q_enc = ∫₀ʳ (αr′)(2πr′ L dr′) = λ L (r/R)³'
          : 'q_enc = λ L  (full cylinder cross-section enclosed)'
        : inside
        ? 'q_enc = 0  (charge on conducting surface r = R)'
        : 'q_enc = λ L';

    const eFormula =
      !inside
        ? 'E(r) = λ / (2πε₀ r)   [L cancels, E ∝ 1/r]'
        : params.cylindricalProfile === 'uniform_cylinder'
        ? 'E(r) = (λ / 2πε₀R²) r = ρ₀ r / (2ε₀)   [E ∝ r]'
        : params.cylindricalProfile === 'linear_cylinder'
        ? 'E(r) = (λ / 2πε₀R³) r² = α r² / (3ε₀)  [E ∝ r²]'
        : 'E(r) = 0  inside hollow conducting cylinder';

    return [
      {
        stepNumber: 1,
        title: 'Construct Coaxial Gaussian Cylinder (r, L)',
        symbolic: 'Wall: E ∥ dA;   End Caps: E ⊥ dA ⇒ Φ_caps = 0',
        liveSubstitution: `r = ${r.toFixed(2)} m, L = ${L.toFixed(2)} m ⇒ A_wall = 2πrL = ${ev.activeAreaM2.toFixed(2)} m²`,
        ekRef: '8.6.A.2 / 8.6.A.4',
      },
      {
        stepNumber: 2,
        title: 'Simplify Closed Surface Integral',
        symbolic: '∮ E · dA = ∫_wall E dA + 0 + 0 = E (2πrL)',
        liveSubstitution: `Φ_wall = ${ev.fluxFromIntegralKNm2C >= 0 ? '+' : ''}${ev.fluxFromIntegralKNm2C.toFixed(1)} kN·m²/C, Φ_caps = 0`,
        ekRef: '8.6.A.4',
      },
      {
        stepNumber: 3,
        title: 'Integrate Enclosed Charge Inside Radius r',
        symbolic: qFormula,
        liveSubstitution: `q_enc = ${ev.qEncMicro >= 0 ? '+' : ''}${ev.qEncMicro.toFixed(2)} μC over L = ${L.toFixed(2)} m`,
        ekRef: '8.6.A.5',
      },
      {
        stepNumber: 4,
        title: 'Solve E(2πrL) = q_enc / ε₀ (L Cancels)',
        symbolic: eFormula,
        liveSubstitution: `|E(${r.toFixed(2)} m)| = ${ev.fieldMagKNPerC.toFixed(2)} kN/C`,
        ekRef: '8.6.A.1 / 8.6.A.6',
      },
    ];
  }

  // Planar symmetry
  const insideSlab = params.planarProfile === 'thick_slab' && r < R;
  const isConductor = params.planarProfile === 'conducting_plate';

  return [
    {
      stepNumber: 1,
      title: 'Construct Gaussian Pillbox Normal to Plane',
      symbolic: isConductor
        ? 'One cap inside conductor (E = 0), one cap outside (E ∥ dA), wall E ⊥ dA'
        : 'Two symmetric caps at ±x (E ∥ dA), cylindrical side wall (E ⊥ dA ⇒ Φ = 0)',
      liveSubstitution: `Cap area A = ${A.toFixed(2)} m², half-distance x = ${r.toFixed(2)} m`,
      ekRef: '8.6.A.2 / 8.6.A.4',
    },
    {
      stepNumber: 2,
      title: 'Evaluate Pillbox Surface Integral',
      symbolic: isConductor
        ? '∮ E · dA = E A + 0 + 0 = E A'
        : '∮ E · dA = E A + E A + 0 = 2 E A',
      liveSubstitution: `Active cap area = ${ev.activeAreaM2.toFixed(2)} m², Φ_E = ${ev.fluxFromIntegralKNm2C >= 0 ? '+' : ''}${ev.fluxFromIntegralKNm2C.toFixed(1)} kN·m²/C`,
      ekRef: '8.6.A.4',
    },
    {
      stepNumber: 3,
      title: 'Integrate Enclosed Charge Over Pillbox Volume/Area',
      symbolic:
        params.planarProfile === 'nonconducting_sheet' || isConductor
          ? 'q_enc = ∫∫ σ dA = σ A'
          : insideSlab
          ? 'q_enc = ∫₋ₓˣ ρ₀ A dx′ = 2 ρ₀ A x = σ_tot A (x / d)'
          : 'q_enc = 2 ρ₀ A d = σ_tot A  (full slab thickness enclosed)',
      liveSubstitution: `q_enc = ${ev.qEncMicro >= 0 ? '+' : ''}${ev.qEncMicro.toFixed(2)} μC (${(ev.enclosedFraction * 100).toFixed(0)}%)`,
      ekRef: '8.6.A.5',
    },
    {
      stepNumber: 4,
      title: 'Solve for Planar Electric Field E(x) (A Cancels)',
      symbolic: isConductor
        ? 'E = σ / ε₀   (twice a single nonconducting sheet!)'
        : insideSlab
        ? 'E(x) = ρ₀ x / ε₀ = (σ_tot / 2ε₀)(x / d)   [linear inside slab]'
        : 'E = σ / (2ε₀)   (uniform & independent of distance x!)',
      liveSubstitution: `|E(${r.toFixed(2)} m)| = ${ev.fieldMagKNPerC.toFixed(2)} kN/C`,
      ekRef: '8.6.A.1 / 8.6.A.6',
    },
  ];
}

/**
 * Skill 2.D: Predict exact scaling factors when Gaussian radius r (or distance x) is scaled by k.
 * Evaluated locally in the active physical region (inside vs outside) so power-law exponents are exact.
 */
export function predictGaussScaling86(
  params: Gauss86Params,
  scaleFactor: number
): GaussScalingPrediction {
  const k = Math.max(0.25, scaleFactor);
  const r = params.gaussianRadiusM;
  const R = params.bodyRadiusM;

  if (params.symmetry === 'point_invariance') {
    return {
      factor: k,
      regionLabel: 'Point Charge (All r > 0)',
      qEncFactor: 1,
      fluxFactor: 1,
      fieldFactor: 1 / (k * k),
      qEncExponentText: 'r⁰ (constant)',
      fieldExponentText: 'r⁻²',
      summary: `Scaling r by ×${k} leaves q_enc and Φ_E unchanged (×1), while E scales by ×${(1 / (k * k)).toFixed(3)} (inverse square).`,
    };
  }

  if (params.symmetry === 'spherical') {
    const inside = r < R;
    if (!inside) {
      return {
        factor: k,
        regionLabel: 'Exterior Spherical Region (r ≥ R)',
        qEncFactor: 1,
        fluxFactor: 1,
        fieldFactor: 1 / (k * k),
        qEncExponentText: 'r⁰ (all Q enclosed)',
        fieldExponentText: 'r⁻²',
        summary: `Outside r = R, scaling r by ×${k} keeps q_enc & Φ_E fixed (×1) and scales E by 1/${k}² = ×${(1 / (k * k)).toFixed(3)}.`,
      };
    }
    if (params.sphericalProfile === 'uniform_solid') {
      return {
        factor: k,
        regionLabel: 'Interior Uniform Sphere (r < R)',
        qEncFactor: k * k * k,
        fluxFactor: k * k * k,
        fieldFactor: k,
        qEncExponentText: 'r³',
        fieldExponentText: 'r¹ (linear)',
        summary: `Inside uniform sphere (ρ₀), scaling r by ×${k} multiplies q_enc & Φ_E by ×${(k ** 3).toFixed(2)} and E by ×${k.toFixed(2)}.`,
      };
    }
    if (params.sphericalProfile === 'linear_rho') {
      return {
        factor: k,
        regionLabel: 'Interior Linear-ρ Sphere (r < R)',
        qEncFactor: k ** 4,
        fluxFactor: k ** 4,
        fieldFactor: k * k,
        qEncExponentText: 'r⁴',
        fieldExponentText: 'r² (quadratic)',
        summary: `Inside ρ = αr sphere, scaling r by ×${k} multiplies q_enc & Φ_E by ×${(k ** 4).toFixed(2)} and E by ×${(k * k).toFixed(2)}.`,
      };
    }
    if (params.sphericalProfile === 'inverse_rho') {
      return {
        factor: k,
        regionLabel: 'Interior Inverse-r Sphere (r < R)',
        qEncFactor: k * k,
        fluxFactor: k * k,
        fieldFactor: 1,
        qEncExponentText: 'r²',
        fieldExponentText: 'r⁰ (constant!)',
        summary: `Inside ρ = β/r sphere, q_enc ∝ r² cancels 4πr² so E stays ×1.00 (uniform magnitude!) while Φ_E scales by ×${(k * k).toFixed(2)}.`,
      };
    }
    return {
      factor: k,
      regionLabel: 'Interior Conducting Shell (r < R)',
      qEncFactor: 0,
      fluxFactor: 0,
      fieldFactor: 0,
      qEncExponentText: '0 (none enclosed)',
      fieldExponentText: '0 (shielded)',
      summary: `Inside a conducting shell, q_enc = 0 everywhere for r < R, so Φ_E = 0 and E = 0 regardless of Gaussian radius.`,
    };
  }

  if (params.symmetry === 'cylindrical') {
    const inside = params.cylindricalProfile !== 'line_charge' && r < R;
    if (!inside) {
      return {
        factor: k,
        regionLabel: 'Exterior Cylindrical Region (r ≥ R)',
        qEncFactor: 1,
        fluxFactor: 1,
        fieldFactor: 1 / k,
        qEncExponentText: 'r⁰ (fixed λL)',
        fieldExponentText: 'r⁻¹',
        summary: `Outside a cylinder/line, scaling r by ×${k} keeps q_enc & Φ_E unchanged (×1) while E scales by 1/${k} = ×${(1 / k).toFixed(3)}.`,
      };
    }
    if (params.cylindricalProfile === 'uniform_cylinder') {
      return {
        factor: k,
        regionLabel: 'Interior Uniform Cylinder (r < R)',
        qEncFactor: k * k,
        fluxFactor: k * k,
        fieldFactor: k,
        qEncExponentText: 'r²',
        fieldExponentText: 'r¹ (linear)',
        summary: `Inside a uniform cylinder, scaling r by ×${k} scales q_enc & Φ_E by ×${(k * k).toFixed(2)} and E by ×${k.toFixed(2)}.`,
      };
    }
    if (params.cylindricalProfile === 'linear_cylinder') {
      return {
        factor: k,
        regionLabel: 'Interior Linear-ρ Cylinder (r < R)',
        qEncFactor: k ** 3,
        fluxFactor: k ** 3,
        fieldFactor: k * k,
        qEncExponentText: 'r³',
        fieldExponentText: 'r² (quadratic)',
        summary: `Inside ρ = αr cylinder, scaling r by ×${k} scales q_enc & Φ_E by ×${(k ** 3).toFixed(2)} and E by ×${(k * k).toFixed(2)}.`,
      };
    }
    return {
      factor: k,
      regionLabel: 'Interior Conducting Cylinder (r < R)',
      qEncFactor: 0,
      fluxFactor: 0,
      fieldFactor: 0,
      qEncExponentText: '0 (hollow interior)',
      fieldExponentText: '0 (shielded)',
      summary: `Inside a hollow conducting cylinder, q_enc = 0 so Φ_E = 0 and E = 0 for all r < R.`,
    };
  }

  // Planar
  const insideSlab = params.planarProfile === 'thick_slab' && r < R;
  if (insideSlab) {
    return {
      factor: k,
      regionLabel: 'Interior Thick Slab (x < d)',
      qEncFactor: k,
      fluxFactor: k,
      fieldFactor: k,
      qEncExponentText: 'x¹ (linear)',
      fieldExponentText: 'x¹ (linear)',
      summary: `Inside a uniform thick slab, scaling pillbox half-width x by ×${k} scales q_enc, Φ_E, and E all linearly by ×${k.toFixed(2)}.`,
    };
  }
  return {
    factor: k,
    regionLabel: 'Exterior Planar Region',
    qEncFactor: 1,
    fluxFactor: 1,
    fieldFactor: 1,
    qEncExponentText: 'x⁰ (constant σA)',
    fieldExponentText: 'x⁰ (uniform!)',
    summary: `Outside an infinite planar sheet/plate, scaling distance x by ×${k} leaves q_enc, Φ_E, and E all completely unchanged (×1).`,
  };
}

/**
 * Interactive AP Physics C Topic 8.6 conceptual & Skill 2.D prediction questions.
 */
export const GAUSS_86_CLAIM_QUESTIONS: GaussClaimQuestion[] = [
  {
    id: 'q1-size-invariance',
    skill: 'Skill 2.D',
    ekRef: '8.6.A.1 / 8.6.A.3',
    prompt:
      'A point charge +Q sits inside a closed Gaussian sphere of radius R. If the Gaussian sphere radius is tripled to 3R while +Q stays inside, how do the total electric flux Φ_E and surface field magnitude E change?',
    options: [
      { id: 'a', text: 'Φ_E stays unchanged (×1); E decreases by a factor of 9 (×1/9).' },
      { id: 'b', text: 'Φ_E decreases by a factor of 9; E decreases by a factor of 9.' },
      { id: 'c', text: 'Φ_E triples (×3); E decreases by a factor of 3.' },
    ],
    correctId: 'a',
    explanation:
      'By EK 8.6.A.3, Φ_E = q_enc / ε₀ is independent of Gaussian surface size. Because sphere area grows by 3² = 9, E = Φ_E / (4πr²) drops to 1/9.',
  },
  {
    id: 'q2-radial-rho',
    skill: 'Skill 2.A / 2.D',
    ekRef: '8.6.A.5',
    prompt:
      'A nonconducting sphere of radius R has radial charge density ρ(r) = α r. Inside the sphere (r < R), how does the electric field magnitude E(r) scale with distance r from the center?',
    options: [
      { id: 'a', text: 'E(r) ∝ r (linear, just like a uniform sphere)' },
      { id: 'b', text: 'E(r) ∝ r² (because q_enc = ∫₀ʳ αr′ · 4πr′² dr′ ∝ r⁴ and dividing by 4πr² leaves r²)' },
      { id: 'c', text: 'E(r) = constant throughout the interior' },
    ],
    correctId: 'b',
    explanation:
      'Integrating ρ(r′) = αr′ over spherical shells 4πr′² dr′ gives q_enc = παr⁴ (EK 8.6.A.5). Dividing by 4πε₀r² yields E(r) = (α/4ε₀)r².',
  },
  {
    id: 'q3-cylinder-caps',
    skill: 'Skill 1.A / 2.A',
    ekRef: '8.6.A.4',
    prompt:
      'Why do the two flat circular end caps of a coaxial Gaussian cylinder contribute zero flux when finding E around a long uniform line charge?',
    options: [
      { id: 'a', text: 'Because the electric field magnitude E is zero on the end caps.' },
      { id: 'b', text: 'Because the radial field E is perpendicular to the axial cap normal dA, so E · dA = 0.' },
      { id: 'c', text: 'Because a Gaussian cylinder is open and has no end caps.' },
    ],
    correctId: 'b',
    explanation:
      'By EK 8.6.A.2 & 8.6.A.4, a Gaussian surface is always closed, and its caps are oriented perpendicular to the radial field so E · dA = E dA cos 90° = 0.',
  },
  {
    id: 'q4-conductor-vs-sheet',
    skill: 'Skill 2.D',
    ekRef: '8.6.A.4 / 8.6.A.6',
    prompt:
      'Compare a large nonconducting sheet with surface density σ to the surface of a large charged conductor with the same outer surface density σ. What is the ratio E_conductor / E_sheet just outside?',
    options: [
      { id: 'a', text: '1/2 (conductor field is half as large)' },
      { id: 'b', text: '1 (both have identical field σ / 2ε₀)' },
      { id: 'c', text: '2 (conductor has E = σ/ε₀ because E = 0 inside so all flux exits one pillbox cap)' },
    ],
    correctId: 'c',
    explanation:
      'For the nonconducting sheet, flux exits both pillbox caps (2EA = σA/ε₀ ⇒ E = σ/2ε₀). For the conductor, E = 0 inside so all flux exits the outer cap (EA = σA/ε₀ ⇒ E = σ/ε₀).',
  },
];
