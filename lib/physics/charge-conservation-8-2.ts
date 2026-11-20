export type Charging82Scenario =
  | 'friction_tribo'
  | 'conduction_contact'
  | 'induction_polarization'
  | 'grounding_earth';

export type TriboMaterialPair = 'glass_silk' | 'teflon_wool' | 'acrylic_fur';
export type InductionTargetKind = 'conductor_pair' | 'neutral_insulator';
export type GroundingMode = 'direct_ground' | 'induction_ground';

export interface Charging82Params {
  scenario: Charging82Scenario;
  // Scenario 1: Friction / Triboelectric
  triboPair: TriboMaterialPair;
  rubProgress: number; // 0..1
  maxTriboTransfer: number; // integer packets (default 6)
  // Scenario 2: Contact / Conduction
  initialQA: number; // -8..+8
  initialQB: number; // -8..+8
  radiusA: number; // 0.6..1.8
  radiusB: number; // 0.6..1.8
  contactPhase: 'before' | 'touching' | 'after';
  contactProgress: number; // 0..1 equilibration while touching
  // Scenario 3: Induction & Polarization
  inductionTarget: InductionTargetKind;
  rodCharge: number; // -8..+8 (non-zero recommended)
  rodProximity: number; // 0..1 (0 = far, 1 = close)
  spheresSeparated: boolean;
  lockedInducedQ: number; // signed charge trapped on Sphere A when separated
  // Scenario 4: Grounding & Induction with Earth
  groundingMode: GroundingMode;
  groundInitialQ: number; // -8..+8 for direct_ground
  isGrounded: boolean;
  groundRodCharge: number; // -8..+8 for induction_ground
  groundRodProximity: number; // 0..1
  groundStep: number; // 0..4 guided steps for induction_ground
  trappedGroundQ: number; // charge trapped on sphere after disconnecting ground
}

export interface ObjectChargeAccount {
  id: string;
  label: string;
  role: 'system' | 'surroundings';
  material: 'conductor' | 'insulator' | 'earth';
  protons: number; // Fixed in solid lattice (never transfers in solid-state charging)
  electrons: number; // Mobile charge carriers
  netCharge: number; // protons - electrons (in elementary packets q0)
  initialCharge: number;
  deltaCharge: number;
  polarization: number; // -1..+1 dipole shift along +X (positive means + shifted right / e- shifted left)
}

export interface ElectronFlowDescriptor {
  active: boolean;
  fromId: string | null;
  toId: string | null;
  fromLabel: string;
  toLabel: string;
  electronsTransferred: number; // positive count moved from -> to
  summary: string;
}

export interface Charging82State {
  scenario: Charging82Scenario;
  objects: ObjectChargeAccount[];
  systemInitialCharge: number;
  systemCurrentCharge: number;
  surroundingsDeltaCharge: number;
  universeInitialCharge: number;
  universeCurrentCharge: number;
  conservationError: number;
  isSystemIsolated: boolean;
  flow: ElectronFlowDescriptor;
  ekBadges: string[];
  mechanismHeadline: string;
  mechanismDetail: string;
  // Quantitative comparison metrics (Skill 2.C)
  equilibriumQA?: number;
  equilibriumQB?: number;
  ratioQAtoQB?: number;
  inducedDipoleStrength: number; // 0..1
}

export interface ChargeBarChartItem {
  id: string;
  label: string;
  initialCharge: number;
  currentCharge: number;
  role: 'system' | 'surroundings';
}

export interface ChargeBarLayoutRect {
  id: string;
  label: string;
  x: number;
  initialY: number;
  initialH: number;
  currentY: number;
  currentH: number;
  zeroY: number;
  initialCharge: number;
  currentCharge: number;
  barWidth: number;
}

export interface ChargeBarChartLayout {
  width: number;
  height: number;
  zeroY: number;
  maxAbsQ: number;
  bars: ChargeBarLayoutRect[];
}

export interface ComparisonTrialRecord {
  id: string;
  label: string;
  scenario: Charging82Scenario;
  qAInitial: number;
  qBInitial: number;
  qAFinal: number;
  qBFinal: number;
  qEarthDelta: number;
  qTotalBefore: number;
  qTotalAfter: number;
  notes: string;
}

export interface TriboPairMetadata {
  id: TriboMaterialPair;
  label: string;
  rodName: string;
  clothName: string;
  electronFlowDirection: 'rod_to_cloth' | 'cloth_to_rod';
  rodColor: string;
  clothColor: string;
  explanation: string;
}

export const TRIBO_PAIRS: Record<TriboMaterialPair, TriboPairMetadata> = {
  glass_silk: {
    id: 'glass_silk',
    label: 'Glass Rod + Silk Cloth',
    rodName: 'Glass Rod',
    clothName: 'Silk Cloth',
    electronFlowDirection: 'rod_to_cloth',
    rodColor: '#cbd5e1',
    clothColor: '#a855f7',
    explanation:
      'Silk has a stronger electron affinity than glass: mechanical friction transfers electrons from the glass rod onto the silk cloth, leaving the glass positive (+Q) and silk negative (−Q).',
  },
  teflon_wool: {
    id: 'teflon_wool',
    label: 'Teflon Rod + Wool Pad',
    rodName: 'Teflon Rod',
    clothName: 'Wool Pad',
    electronFlowDirection: 'cloth_to_rod',
    rodColor: '#e2e8f0',
    clothColor: '#d97706',
    explanation:
      'Teflon strongly attracts electrons away from wool: friction transfers electrons from the wool pad onto the Teflon rod, leaving Teflon negative (−Q) and wool positive (+Q).',
  },
  acrylic_fur: {
    id: 'acrylic_fur',
    label: 'Rubber Rod + Rabbit Fur',
    rodName: 'Rubber Rod',
    clothName: 'Fur Pad',
    electronFlowDirection: 'cloth_to_rod',
    rodColor: '#475569',
    clothColor: '#b45309',
    explanation:
      'Hard rubber captures valence electrons from fur during rubbing: electrons transfer from fur to the rubber rod so Q_rod = −Q and Q_fur = +Q with Q_total = 0.',
  },
};

export const BASE_LATTICE_PROTONS = 12;

export function createDefaultCharging82Params(
  scenario: Charging82Scenario = 'friction_tribo'
): Charging82Params {
  return {
    scenario,
    triboPair: 'glass_silk',
    rubProgress: 0.65,
    maxTriboTransfer: 6,
    initialQA: 6,
    initialQB: -2,
    radiusA: 1.0,
    radiusB: 1.0,
    contactPhase: 'before',
    contactProgress: 0,
    inductionTarget: 'conductor_pair',
    rodCharge: -6,
    rodProximity: 0.85,
    spheresSeparated: false,
    lockedInducedQ: 0,
    groundingMode: 'induction_ground',
    groundInitialQ: 6,
    isGrounded: false,
    groundRodCharge: -6,
    groundRodProximity: 0.9,
    groundStep: 1,
    trappedGroundQ: 0,
  };
}

/**
 * Computes exact induced charge magnitude transferred between touching neutral spheres
 * (or to/from Earth when grounded) in response to an inducing rod.
 */
export function computeInducedMagnitude(rodCharge: number, rodProximity: number): number {
  const prox = Math.max(0, Math.min(1, rodProximity));
  // Smooth nonlinear electrostatic proximity response (stronger as distance decreases)
  const coupling = Math.pow(prox, 1.35) * 0.72;
  return Number((Math.abs(rodCharge) * coupling).toFixed(2));
}

/**
 * Computes equilibrium charges on two touching conducting spheres of radii R_A and R_B:
 * At electrostatic equilibrium V_A = V_B => Q_A / R_A = Q_B / R_B and Q_A + Q_B = Q_tot.
 */
export function computeConductionEquilibrium(
  initialQA: number,
  initialQB: number,
  radiusA: number,
  radiusB: number
): { qA: number; qB: number; totalQ: number; electronsToA: number } {
  const safeRA = Math.max(0.2, radiusA);
  const safeRB = Math.max(0.2, radiusB);
  const totalQ = initialQA + initialQB;
  const qA = Number(((totalQ * safeRA) / (safeRA + safeRB)).toFixed(3));
  const qB = Number((totalQ - qA).toFixed(3));
  // Each electron carries -1 packet of charge, so ΔQ_A = -(ΔN_e,A) => ΔN_e,A = initialQA - qA
  const electronsToA = Number((initialQA - qA).toFixed(3));
  return { qA, qB, totalQ, electronsToA };
}

/**
 * Pure deterministic physics evaluator for all four AP Physics C Topic 8.2 charging mechanisms.
 */
export function evaluateCharging82State(params: Charging82Params): Charging82State {
  switch (params.scenario) {
    case 'friction_tribo': {
      const meta = TRIBO_PAIRS[params.triboPair];
      const clampedRub = Math.max(0, Math.min(1, params.rubProgress));
      const transferred = Math.round(clampedRub * params.maxTriboTransfer);
      const rodLosesElectrons = meta.electronFlowDirection === 'rod_to_cloth';

      const rawRod = rodLosesElectrons ? transferred : -transferred;
      const qRod = rawRod === 0 ? 0 : rawRod;
      const qCloth = qRod === 0 ? 0 : -qRod;

      const rodProtons = BASE_LATTICE_PROTONS;
      const clothProtons = BASE_LATTICE_PROTONS;
      const rodElectrons = rodProtons - qRod;
      const clothElectrons = clothProtons - qCloth;

      const objects: ObjectChargeAccount[] = [
        {
          id: 'rod',
          label: meta.rodName,
          role: 'system',
          material: 'insulator',
          protons: rodProtons,
          electrons: rodElectrons,
          netCharge: qRod,
          initialCharge: 0,
          deltaCharge: qRod,
          polarization: 0,
        },
        {
          id: 'cloth',
          label: meta.clothName,
          role: 'system',
          material: 'insulator',
          protons: clothProtons,
          electrons: clothElectrons,
          netCharge: qCloth,
          initialCharge: 0,
          deltaCharge: qCloth,
          polarization: 0,
        },
      ];

      const flow: ElectronFlowDescriptor = {
        active: transferred > 0,
        fromId: transferred > 0 ? (rodLosesElectrons ? 'rod' : 'cloth') : null,
        toId: transferred > 0 ? (rodLosesElectrons ? 'cloth' : 'rod') : null,
        fromLabel: rodLosesElectrons ? meta.rodName : meta.clothName,
        toLabel: rodLosesElectrons ? meta.clothName : meta.rodName,
        electronsTransferred: transferred,
        summary:
          transferred > 0
            ? `${transferred} e⁻ transferred from ${rodLosesElectrons ? meta.rodName : meta.clothName} → ${rodLosesElectrons ? meta.clothName : meta.rodName}`
            : 'No rubbing contact yet — both objects remain electrically neutral.',
      };

      const systemCurrentCharge = qRod + qCloth;
      return {
        scenario: 'friction_tribo',
        objects,
        systemInitialCharge: 0,
        systemCurrentCharge,
        surroundingsDeltaCharge: 0,
        universeInitialCharge: 0,
        universeCurrentCharge: systemCurrentCharge,
        conservationError: Math.abs(systemCurrentCharge - 0),
        isSystemIsolated: true,
        flow,
        ekBadges: ['8.2.A.1.i Friction', '8.2.A.2.i Electron Transfer', '8.2.A.2.ii Isolated Conservation'],
        mechanismHeadline: 'Triboelectric Charging by Friction (Isolated Two-Body System)',
        mechanismDetail: meta.explanation,
        inducedDipoleStrength: 0,
      };
    }

    case 'conduction_contact': {
      const eq = computeConductionEquilibrium(
        params.initialQA,
        params.initialQB,
        params.radiusA,
        params.radiusB
      );

      const alpha =
        params.contactPhase === 'before'
          ? 0
          : params.contactPhase === 'after'
          ? 1
          : Math.max(0, Math.min(1, params.contactProgress));

      const qA = Number((params.initialQA + (eq.qA - params.initialQA) * alpha).toFixed(3));
      const qB = Number((eq.totalQ - qA).toFixed(3));

      const protonsA = BASE_LATTICE_PROTONS;
      const protonsB = BASE_LATTICE_PROTONS;
      const electronsA = Number((protonsA - qA).toFixed(3));
      const electronsB = Number((protonsB - qB).toFixed(3));

      const deltaE_toA = Number((params.initialQA - qA).toFixed(3));
      const absTransferred = Math.abs(deltaE_toA);
      const bToA = deltaE_toA > 0.001;
      const aToB = deltaE_toA < -0.001;

      const objects: ObjectChargeAccount[] = [
        {
          id: 'sphereA',
          label: `Sphere A (R=${params.radiusA.toFixed(1)})`,
          role: 'system',
          material: 'conductor',
          protons: protonsA,
          electrons: electronsA,
          netCharge: qA,
          initialCharge: params.initialQA,
          deltaCharge: Number((qA - params.initialQA).toFixed(3)),
          polarization: 0,
        },
        {
          id: 'sphereB',
          label: `Sphere B (R=${params.radiusB.toFixed(1)})`,
          role: 'system',
          material: 'conductor',
          protons: protonsB,
          electrons: electronsB,
          netCharge: qB,
          initialCharge: params.initialQB,
          deltaCharge: Number((qB - params.initialQB).toFixed(3)),
          polarization: 0,
        },
      ];

      const flow: ElectronFlowDescriptor = {
        active: absTransferred > 0.01,
        fromId: bToA ? 'sphereB' : aToB ? 'sphereA' : null,
        toId: bToA ? 'sphereA' : aToB ? 'sphereB' : null,
        fromLabel: bToA ? 'Sphere B' : 'Sphere A',
        toLabel: bToA ? 'Sphere A' : 'Sphere B',
        electronsTransferred: Number(absTransferred.toFixed(2)),
        summary:
          absTransferred <= 0.01
            ? params.contactPhase === 'before'
              ? 'Spheres separated — bring into contact to allow conduction.'
              : 'Already at equal electric potential (V_A = V_B) — zero net electron transfer.'
            : `${absTransferred.toFixed(2)} e⁻ moved from ${bToA ? 'Sphere B → Sphere A' : 'Sphere A → Sphere B'} until V_A = V_B.`,
      };

      const systemCurrentCharge = Number((qA + qB).toFixed(3));
      const ratioQAtoQB =
        Math.abs(eq.qB) > 1e-4 ? Number((eq.qA / eq.qB).toFixed(3)) : Number((params.radiusA / params.radiusB).toFixed(3));

      return {
        scenario: 'conduction_contact',
        objects,
        systemInitialCharge: eq.totalQ,
        systemCurrentCharge,
        surroundingsDeltaCharge: 0,
        universeInitialCharge: eq.totalQ,
        universeCurrentCharge: systemCurrentCharge,
        conservationError: Number(Math.abs(systemCurrentCharge - eq.totalQ).toFixed(6)),
        isSystemIsolated: true,
        flow,
        ekBadges: ['8.2.A.1.i Contact Conduction', '8.2.A.2.i Electron Flow', '8.2.A.2.ii Q_A + Q_B = const'],
        mechanismHeadline:
          Math.abs(params.radiusA - params.radiusB) < 0.05
            ? 'Contact Conduction — Identical Conductors Split Total Charge Equally'
            : 'Contact Conduction — Equipotential Sharing Proportional to Radius (Q ∝ R)',
        mechanismDetail:
          'When conductors touch, mobile electrons migrate until both surfaces reach the same electric potential (V_A = V_B). Positive atomic nuclei stay fixed in each metal lattice, and Q_A + Q_B remains strictly conserved.',
        equilibriumQA: eq.qA,
        equilibriumQB: eq.qB,
        ratioQAtoQB,
        inducedDipoleStrength: 0,
      };
    }

    case 'induction_polarization': {
      const prox = Math.max(0, Math.min(1, params.rodProximity));
      const rodSign = Math.sign(params.rodCharge); // +1, -1, or 0
      const inducedMag = computeInducedMagnitude(params.rodCharge, prox);
      const dipoleStrength = Math.min(1, (Math.abs(params.rodCharge) / 8) * Math.pow(prox, 1.2));

      if (params.inductionTarget === 'conductor_pair') {
        // Rod sits on the LEFT (-X). Sphere A is near the rod, Sphere B is to the right (+X).
        // If rod is positive (+), electrons are pulled leftward into Sphere A => Q_A < 0, Q_B > 0.
        // If rod is negative (-), electrons are pushed rightward into Sphere B => Q_A > 0, Q_B < 0.
        const liveInducedQA = Number((-rodSign * inducedMag).toFixed(2));
        const qA = params.spheresSeparated ? Number(params.lockedInducedQ.toFixed(2)) : liveInducedQA;
        const qB = Number((-qA).toFixed(2));

        // Local polarization inside each sphere when rod is near
        // Positive polarization means positive center is shifted +X (right), electrons shifted -X (left).
        // Rod is at -X: if rod is +1, electrons pulled left (-X), positive shifted right (+X) => pol = +dipoleStrength.
        const localPol = Number((rodSign * dipoleStrength * (params.spheresSeparated ? 0.55 : 0.9)).toFixed(3));

        const objects: ObjectChargeAccount[] = [
          {
            id: 'rod',
            label: 'Inducing Rod (External)',
            role: 'surroundings',
            material: 'insulator',
            protons: BASE_LATTICE_PROTONS,
            electrons: BASE_LATTICE_PROTONS - params.rodCharge,
            netCharge: params.rodCharge,
            initialCharge: params.rodCharge,
            deltaCharge: 0,
            polarization: 0,
          },
          {
            id: 'sphereA',
            label: 'Near Sphere A',
            role: 'system',
            material: 'conductor',
            protons: BASE_LATTICE_PROTONS,
            electrons: Number((BASE_LATTICE_PROTONS - qA).toFixed(2)),
            netCharge: qA,
            initialCharge: 0,
            deltaCharge: qA,
            polarization: localPol,
          },
          {
            id: 'sphereB',
            label: 'Far Sphere B',
            role: 'system',
            material: 'conductor',
            protons: BASE_LATTICE_PROTONS,
            electrons: Number((BASE_LATTICE_PROTONS - qB).toFixed(2)),
            netCharge: qB,
            initialCharge: 0,
            deltaCharge: qB,
            polarization: localPol,
          },
        ];

        const eMoved = Math.abs(qA);
        const electronsMovedToA = qA < -0.01;
        const flow: ElectronFlowDescriptor = {
          active: eMoved > 0.01,
          fromId: eMoved > 0.01 ? (electronsMovedToA ? 'sphereB' : 'sphereA') : null,
          toId: eMoved > 0.01 ? (electronsMovedToA ? 'sphereA' : 'sphereB') : null,
          fromLabel: electronsMovedToA ? 'Sphere B' : 'Sphere A',
          toLabel: electronsMovedToA ? 'Sphere A' : 'Sphere B',
          electronsTransferred: Number(eMoved.toFixed(2)),
          summary: params.spheresSeparated
            ? `Spheres separated — ${eMoved.toFixed(2)} e⁻ redistribution is permanently locked (Q_A = ${qA >= 0 ? '+' : ''}${qA.toFixed(2)}, Q_B = ${qB >= 0 ? '+' : ''}${qB.toFixed(2)}).`
            : eMoved > 0.01
            ? `Rod never touches spheres: electrostatic force shifts ${eMoved.toFixed(2)} e⁻ from ${electronsMovedToA ? 'Sphere B → Sphere A' : 'Sphere A → Sphere B'}.`
            : 'Rod is neutral or far away — spheres show zero induced separation.',
        };

        const sysCurrent = Number((qA + qB).toFixed(3));
        return {
          scenario: 'induction_polarization',
          objects,
          systemInitialCharge: 0,
          systemCurrentCharge: sysCurrent,
          surroundingsDeltaCharge: 0,
          universeInitialCharge: params.rodCharge,
          universeCurrentCharge: Number((params.rodCharge + sysCurrent).toFixed(3)),
          conservationError: Math.abs(sysCurrent),
          isSystemIsolated: true,
          flow,
          ekBadges: ['8.2.A.1.ii Induced Polarization', '8.2.A.1.iii Neutral System', '8.2.A.2.ii Q_A + Q_B = 0'],
          mechanismHeadline: params.spheresSeparated
            ? 'Charging by Induction — Permanent Opposite Charges Trapped Without Contact'
            : 'Induced Charge Separation Across Neutral Touching Conductors',
          mechanismDetail: params.spheresSeparated
            ? 'Because Spheres A and B were separated while polarized, electrons cannot return when the rod moves away. Neither sphere touched the rod, yet Q_A = −Q_B and Q_A + Q_B = 0.'
            : 'The external charged rod exerts electrostatic forces on mobile electrons across the touching neutral pair, polarizing Sphere A opposite to the rod and Sphere B the same sign as the rod while total system charge stays 0.',
          inducedDipoleStrength: dipoleStrength,
        };
      } else {
        // Neutral Insulator / Dielectric Block: ZERO net charge transfer, bound molecular dipoles stretch!
        const localPol = Number((rodSign * dipoleStrength).toFixed(3));
        const objects: ObjectChargeAccount[] = [
          {
            id: 'rod',
            label: 'Inducing Rod (External)',
            role: 'surroundings',
            material: 'insulator',
            protons: BASE_LATTICE_PROTONS,
            electrons: BASE_LATTICE_PROTONS - params.rodCharge,
            netCharge: params.rodCharge,
            initialCharge: params.rodCharge,
            deltaCharge: 0,
            polarization: 0,
          },
          {
            id: 'insulator',
            label: 'Neutral Insulator Block',
            role: 'system',
            material: 'insulator',
            protons: BASE_LATTICE_PROTONS,
            electrons: BASE_LATTICE_PROTONS,
            netCharge: 0,
            initialCharge: 0,
            deltaCharge: 0,
            polarization: localPol,
          },
        ];

        const flow: ElectronFlowDescriptor = {
          active: false,
          fromId: null,
          toId: null,
          fromLabel: 'None',
          toLabel: 'None',
          electronsTransferred: 0,
          summary:
            dipoleStrength > 0.05
              ? `Bound atomic dipoles align locally (${Math.round(dipoleStrength * 100)}% polarization); zero electrons cross the boundary (Q_net = 0).`
              : 'Insulator atomic dipoles are unpolarized; Q_net = 0.',
        };

        return {
          scenario: 'induction_polarization',
          objects,
          systemInitialCharge: 0,
          systemCurrentCharge: 0,
          surroundingsDeltaCharge: 0,
          universeInitialCharge: params.rodCharge,
          universeCurrentCharge: params.rodCharge,
          conservationError: 0,
          isSystemIsolated: true,
          flow,
          ekBadges: ['8.2.A.1.ii Polarization', '8.2.A.1.iii Neutral Insulator', '8.2.A.2.ii Q_net = 0'],
          mechanismHeadline: 'Dielectric Polarization in a Neutral Insulator (Bound Dipoles)',
          mechanismDetail:
            'In an insulator, electrons remain bound to their parent atoms. Bringing a charged rod nearby stretches and aligns atomic dipoles so the near face has opposite bound surface charge—attracting the neutral object even though Q_net = 0.',
          inducedDipoleStrength: dipoleStrength,
        };
      }
    }

    case 'grounding_earth': {
      if (params.groundingMode === 'direct_ground') {
        const qInit = params.groundInitialQ;
        const qSphere = params.isGrounded ? 0 : qInit;
        const deltaSphere = Number((qSphere - qInit).toFixed(3));
        const qEarthDelta = Number((-deltaSphere).toFixed(3));

        // Electrons moved: ΔN_e,sphere = -ΔQ_sphere
        const electronsToSphere = -deltaSphere;
        const earthToSphere = electronsToSphere > 0.01;
        const sphereToEarth = electronsToSphere < -0.01;

        const objects: ObjectChargeAccount[] = [
          {
            id: 'sphere',
            label: 'Conducting Sphere',
            role: 'system',
            material: 'conductor',
            protons: BASE_LATTICE_PROTONS,
            electrons: Number((BASE_LATTICE_PROTONS - qSphere).toFixed(2)),
            netCharge: qSphere,
            initialCharge: qInit,
            deltaCharge: deltaSphere,
            polarization: 0,
          },
          {
            id: 'earth',
            label: 'Earth (Ground Reservoir)',
            role: 'surroundings',
            material: 'earth',
            protons: 1000000,
            electrons: Number((1000000 - qEarthDelta).toFixed(2)),
            netCharge: qEarthDelta,
            initialCharge: 0,
            deltaCharge: qEarthDelta,
            polarization: 0,
          },
        ];

        const flow: ElectronFlowDescriptor = {
          active: params.isGrounded && Math.abs(electronsToSphere) > 0.01,
          fromId: earthToSphere ? 'earth' : sphereToEarth ? 'sphere' : null,
          toId: earthToSphere ? 'sphere' : sphereToEarth ? 'earth' : null,
          fromLabel: earthToSphere ? 'Earth' : 'Conducting Sphere',
          toLabel: earthToSphere ? 'Conducting Sphere' : 'Earth',
          electronsTransferred: Number(Math.abs(electronsToSphere).toFixed(2)),
          summary: !params.isGrounded
            ? `Ground switch open — sphere is isolated with constant Q = ${qSphere >= 0 ? '+' : ''}${qSphere.toFixed(1)} q₀.`
            : Math.abs(electronsToSphere) <= 0.01
            ? 'Sphere is already neutral — no net electron flow through ground wire.'
            : earthToSphere
            ? `${Math.abs(electronsToSphere).toFixed(1)} e⁻ flowed from Earth → Sphere to neutralize positive deficit.`
            : `${Math.abs(electronsToSphere).toFixed(1)} e⁻ flowed from Sphere → Earth to discharge excess electrons.`,
        };

        const universeCurrent = Number((qSphere + qEarthDelta).toFixed(3));
        return {
          scenario: 'grounding_earth',
          objects,
          systemInitialCharge: qInit,
          systemCurrentCharge: qSphere,
          surroundingsDeltaCharge: qEarthDelta,
          universeInitialCharge: qInit,
          universeCurrentCharge: universeCurrent,
          conservationError: Number(Math.abs(universeCurrent - qInit).toFixed(6)),
          isSystemIsolated: !params.isGrounded,
          flow,
          ekBadges: ['8.2.A.3 Grounding (Earth)', '8.2.A.2.i Electron Flow', '8.2.A.2 Charge Transfer'],
          mechanismHeadline: params.isGrounded
            ? 'Direct Grounding — Sphere Neutralized via Electron Exchange with Earth'
            : 'Isolated Charged Sphere — Open Ground Switch Prevents Charge Transfer',
          mechanismDetail:
            'Earth acts as an enormous, approximately neutral charge reservoir (R_Earth ≫ R_sphere). Connecting the ground wire lets electrons flow to or from Earth until the sphere reaches V ≈ 0 (Q_sphere = 0), while ΔQ_sphere + ΔQ_Earth = 0.',
          inducedDipoleStrength: 0,
        };
      } else {
        // 4-step Induction with Grounding (plus free manual exploration)
        const prox = Math.max(0, Math.min(1, params.groundRodProximity));
        const rodSign = Math.sign(params.groundRodCharge);
        const inducedMag = computeInducedMagnitude(params.groundRodCharge, prox);
        // When grounded while rod is near: Earth supplies/removes electrons so the sphere takes charge OPPOSITE to the rod!
        const liveGroundedQ = Number((-rodSign * inducedMag).toFixed(2));
        const qSphere = params.isGrounded ? liveGroundedQ : Number(params.trappedGroundQ.toFixed(2));
        const qEarthDelta = Number((-qSphere).toFixed(2));
        const dipoleStrength = Math.min(1, (Math.abs(params.groundRodCharge) / 8) * Math.pow(prox, 1.2));
        const localPol = Number((rodSign * dipoleStrength * (params.isGrounded ? 0.35 : 0.85)).toFixed(3));

        const electronsToSphere = -qSphere; // since sphere starts neutral (0)
        const earthToSphere = electronsToSphere > 0.01;
        const sphereToEarth = electronsToSphere < -0.01;

        const objects: ObjectChargeAccount[] = [
          {
            id: 'rod',
            label: 'Inducing Rod',
            role: 'surroundings',
            material: 'insulator',
            protons: BASE_LATTICE_PROTONS,
            electrons: BASE_LATTICE_PROTONS - params.groundRodCharge,
            netCharge: params.groundRodCharge,
            initialCharge: params.groundRodCharge,
            deltaCharge: 0,
            polarization: 0,
          },
          {
            id: 'sphere',
            label: 'Conducting Sphere',
            role: 'system',
            material: 'conductor',
            protons: BASE_LATTICE_PROTONS,
            electrons: Number((BASE_LATTICE_PROTONS - qSphere).toFixed(2)),
            netCharge: qSphere,
            initialCharge: 0,
            deltaCharge: qSphere,
            polarization: localPol,
          },
          {
            id: 'earth',
            label: 'Earth (Ground)',
            role: 'surroundings',
            material: 'earth',
            protons: 1000000,
            electrons: Number((1000000 - qEarthDelta).toFixed(2)),
            netCharge: qEarthDelta,
            initialCharge: 0,
            deltaCharge: qEarthDelta,
            polarization: 0,
          },
        ];

        const flow: ElectronFlowDescriptor = {
          active: params.isGrounded && Math.abs(electronsToSphere) > 0.01,
          fromId: earthToSphere ? 'earth' : sphereToEarth ? 'sphere' : null,
          toId: earthToSphere ? 'sphere' : sphereToEarth ? 'earth' : null,
          fromLabel: earthToSphere ? 'Earth' : 'Conducting Sphere',
          toLabel: earthToSphere ? 'Conducting Sphere' : 'Earth',
          electronsTransferred: Number(Math.abs(electronsToSphere).toFixed(2)),
          summary: params.isGrounded
            ? Math.abs(electronsToSphere) > 0.01
              ? `Ground closed: ${Math.abs(electronsToSphere).toFixed(2)} e⁻ ${earthToSphere ? 'drawn from Earth → Sphere' : 'repelled from Sphere → Earth'}.`
              : 'Ground closed with rod far away — sphere discharges to Q = 0.'
            : Math.abs(qSphere) > 0.01
            ? `Ground opened first — permanent charge Q = ${qSphere >= 0 ? '+' : ''}${qSphere.toFixed(2)} q₀ is trapped on the sphere!`
            : prox > 0.15
            ? 'Rod near ungrounded neutral sphere: charges polarize locally with Q_net = 0.'
            : 'Sphere is isolated and neutral (Q = 0).',
        };

        const universeInitial = params.groundRodCharge;
        const universeCurrent = Number((params.groundRodCharge + qSphere + qEarthDelta).toFixed(3));

        return {
          scenario: 'grounding_earth',
          objects,
          systemInitialCharge: 0,
          systemCurrentCharge: qSphere,
          surroundingsDeltaCharge: qEarthDelta,
          universeInitialCharge: universeInitial,
          universeCurrentCharge: universeCurrent,
          conservationError: Number(Math.abs(universeCurrent - universeInitial).toFixed(6)),
          isSystemIsolated: !params.isGrounded,
          flow,
          ekBadges: ['8.2.A.3 Grounded Induction', '8.2.A.1.ii Polarization', '8.2.A.2 Surroundings Transfer'],
          mechanismHeadline:
            !params.isGrounded && Math.abs(qSphere) > 0.01 && prox < 0.2
              ? 'Induction Complete — Sphere Permanently Charged Opposite to Rod'
              : params.isGrounded
              ? 'Step 2: Ground Switch Closed — Electrons Exchange with Earth'
              : 'Charging a Single Conductor by Induction Using Earth Ground',
          mechanismDetail:
            'To permanently charge a conductor by induction with ground: (1) bring charged rod near, (2) connect ground so repelled/attracted electrons flow with Earth, (3) disconnect ground BEFORE removing the rod, (4) remove rod.',
          inducedDipoleStrength: dipoleStrength,
        };
      }
    }
  }
}

/**
 * Pure helper to advance the guided 4-step Induction with Grounding sequence cleanly.
 */
export function applyGroundedInductionStep(
  prev: Charging82Params,
  step: number
): Charging82Params {
  const clampedStep = Math.max(0, Math.min(4, Math.round(step)));
  const rodSign = Math.sign(prev.groundRodCharge || -6);
  const fullInduced = computeInducedMagnitude(prev.groundRodCharge || -6, 0.92);
  const targetQ = Number((-rodSign * fullInduced).toFixed(2));

  switch (clampedStep) {
    case 0:
      return {
        ...prev,
        groundingMode: 'induction_ground',
        groundStep: 0,
        groundRodProximity: 0,
        isGrounded: false,
        trappedGroundQ: 0,
      };
    case 1:
      return {
        ...prev,
        groundingMode: 'induction_ground',
        groundStep: 1,
        groundRodProximity: 0.92,
        isGrounded: false,
        trappedGroundQ: 0,
      };
    case 2:
      return {
        ...prev,
        groundingMode: 'induction_ground',
        groundStep: 2,
        groundRodProximity: 0.92,
        isGrounded: true,
        trappedGroundQ: targetQ,
      };
    case 3:
      return {
        ...prev,
        groundingMode: 'induction_ground',
        groundStep: 3,
        groundRodProximity: 0.92,
        isGrounded: false,
        trappedGroundQ: targetQ,
      };
    case 4:
    default:
      return {
        ...prev,
        groundingMode: 'induction_ground',
        groundStep: 4,
        groundRodProximity: 0,
        isGrounded: false,
        trappedGroundQ: targetQ,
      };
  }
}

/**
 * Computes geometry for the Skill 1.A Before/After Charge Conservation Bar Chart SVG.
 * Guarantees all bars stay within [padTop, height - padBottom].
 */
export function computeChargeBarChartLayout(
  items: ChargeBarChartItem[],
  width = 320,
  height = 156
): ChargeBarChartLayout {
  const padLeft = 28;
  const padRight = 14;
  const padTop = 20;
  const padBottom = 28;
  const plotH = Math.max(40, height - padTop - padBottom);
  const zeroY = padTop + plotH / 2;

  const maxAbsQ = Math.max(
    4,
    ...items.map(it => Math.max(Math.abs(it.initialCharge), Math.abs(it.currentCharge)))
  );
  const halfScale = (plotH / 2) - 4;

  const count = Math.max(1, items.length);
  const usableW = Math.max(80, width - padLeft - padRight);
  const groupW = usableW / count;
  const barWidth = Math.max(10, Math.min(24, groupW * 0.3));

  const bars: ChargeBarLayoutRect[] = items.map((item, idx) => {
    const cx = padLeft + groupW * (idx + 0.5);
    const initPx = (item.initialCharge / maxAbsQ) * halfScale;
    const currPx = (item.currentCharge / maxAbsQ) * halfScale;

    return {
      id: item.id,
      label: item.label,
      x: cx,
      initialY: initPx >= 0 ? zeroY - initPx : zeroY,
      initialH: Math.abs(initPx),
      currentY: currPx >= 0 ? zeroY - currPx : zeroY,
      currentH: Math.abs(currPx),
      zeroY,
      initialCharge: item.initialCharge,
      currentCharge: item.currentCharge,
      barWidth,
    };
  });

  return { width, height, zeroY, maxAbsQ, bars };
}

export interface ClaimChallengeItem {
  id: string;
  skill: '3.B' | '3.C';
  ekRef: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  justification: string;
}

export const TOPIC_8_2_CLAIMS: ClaimChallengeItem[] = [
  {
    id: 'claim-electron-transfer',
    skill: '3.B',
    ekRef: '8.2.A.2.i',
    prompt:
      'A neutral glass rod is rubbed with a neutral silk cloth, leaving the glass rod with +6 q₀. Which physical transfer occurred?',
    options: [
      { id: 'a', text: '6 protons transferred from silk onto the glass rod.' },
      { id: 'b', text: '6 electrons transferred from the glass rod onto the silk cloth.' },
      { id: 'c', text: '6 positive charges were created by friction energy.' },
    ],
    correctOptionId: 'b',
    justification:
      'Per EK 8.2.A.2.i and 8.2.A.2.ii, atomic nuclei (protons) stay fixed in solid lattices; charging occurs via electron transfer. Losing 6 electrons leaves the glass at +6 q₀ and silk at −6 q₀, conserving Q_total = 0.',
  },
  {
    id: 'claim-neutral-polarization',
    skill: '3.C',
    ekRef: '8.2.A.1.iii',
    prompt:
      'A positively charged rod is brought near (without touching) a neutral insulating foam block. Why does the block experience a net attraction?',
    options: [
      {
        id: 'a',
        text: 'The rod induces dipole polarization so opposite bound charges sit closer to the rod while Q_net stays 0.',
      },
      {
        id: 'b',
        text: 'Free electrons jump through the air from the foam block onto the rod.',
      },
      {
        id: 'c',
        text: 'Neutral insulators cannot be polarized and feel zero electric force.',
      },
    ],
    correctOptionId: 'a',
    justification:
      'Per EK 8.2.A.1.ii–iii, induced charge separation occurs in neutral systems. Because the opposite-sign side of each stretched atomic dipole is closer to the rod, the attractive 1/r² force exceeds the repulsive force on the farther side.',
  },
  {
    id: 'claim-grounding-order',
    skill: '3.C',
    ekRef: '8.2.A.3',
    prompt:
      'A negatively charged rod is held near a grounded neutral metal sphere. To leave the sphere permanently POSITIVE, what must happen first?',
    options: [
      { id: 'a', text: 'Move the negative rod away first, then disconnect the ground wire.' },
      { id: 'b', text: 'Disconnect the ground wire first while the rod is still near, then move the rod away.' },
      { id: 'c', text: 'Touch the negative rod directly to the sphere while grounded.' },
    ],
    correctOptionId: 'b',
    justification:
      'Per EK 8.2.A.3, while the negative rod is near, repelled electrons escape into Earth. Opening the ground switch first isolates the sphere so those electrons cannot return when the rod is removed, trapping net +Q.',
  },
  {
    id: 'claim-unequal-spheres',
    skill: '3.B',
    ekRef: '8.2.A.1.i',
    prompt:
      'Two insulated conducting spheres with radii R_A = 2R and R_B = R carry +9 q₀ and 0 q₀. After touching and separating, how do their charges compare?',
    options: [
      { id: 'a', text: 'Both carry +4.5 q₀ regardless of sphere radius.' },
      { id: 'b', text: 'Sphere A carries +6 q₀ and Sphere B carries +3 q₀ (total +9 q₀ conserved).' },
      { id: 'c', text: 'Sphere A carries +3 q₀ and Sphere B carries +6 q₀.' },
    ],
    correctOptionId: 'b',
    justification:
      'Conductors in contact equalize electric potential V = kQ/R, so Q_A/R_A = Q_B/R_B. With R_A = 2R_B and Q_A + Q_B = +9 q₀ (EK 8.2.A.2.ii), Q_A = +6 q₀ and Q_B = +3 q₀.',
  },
];
