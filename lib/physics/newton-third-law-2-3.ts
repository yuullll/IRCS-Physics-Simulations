// Pure physics engine, AP FBD/tension profile diagram layouts, and claim checks for
// AP Physics C: Mechanics — Unit 2, Topic 2.3: Newton's Third Law
// Covers LO 2.3.A (2.3.A.1, 2.3.A.2, 2.3.A.3, 2.3.A.3.i–iv) and Skills 1.A, 2.C, 3.B, 3.C.

export const GRAVITY_G = 9.81;

export type Newton23Mode =
  | 'action_reaction'
  | 'internal_com'
  | 'string_tension'
  | 'ideal_pulley';

export type ActionReactionPreset =
  | 'contact_push'
  | 'ice_pushoff'
  | 'book_earth';

export type StringOrientation = 'vertical_hanging' | 'horizontal_pull';

export type PulleyPreset = 'atwood' | 'modified_atwood';

export interface Newton23Params {
  mode: Newton23Mode;
  simTimeS: number;

  // Mode 1: Action-Reaction Paired Forces (2.3.A.1)
  arPreset: ActionReactionPreset;
  massA: number; // kg
  massB: number; // kg
  appliedForceN: number; // external push or internal push-off magnitude (N)
  highlightThirdLawPair: boolean;

  // Mode 2: Internal Forces & System COM (2.3.A.2)
  internalForceAmpN: number; // internal spring/oscillation force amplitude (N)
  externalForceN: number; // external force on A+B system (N)
  showSystemBoundary: boolean; // true = combined {A+B} system view, false = isolated A & B

  // Mode 3: Macroscopic Tension & Micro-Segments (2.3.A.3, 2.3.A.3.i–iii)
  stringOrientation: StringOrientation;
  loadMassKg: number; // hanging or towed block mass (kg)
  ropeMassKg: number; // 0 = Ideal String (2.3.A.3.i–ii), > 0 = Massive String (2.3.A.3.iii)
  verticalAccelMs2: number; // elevator/hoist acceleration a_y (m/s^2) in vertical mode
  horizontalPullN: number; // external pull force (N) in horizontal mode
  segmentCount: number; // discrete infinitesimal segments displayed (6..10)
  probeSegmentIndex: number; // 0..segmentCount-1 highlighted segment

  // Mode 4: Ideal vs Non-Ideal Pulley (2.3.A.3.iv)
  pulleyPreset: PulleyPreset;
  pulleyMassA: number; // kg (left/table mass)
  pulleyMassB: number; // kg (right/hanging mass)
  isIdealPulley: boolean; // true = massless frictionless (2.3.A.3.iv)
  pulleyWheelMassKg: number; // kg when non-ideal
  pulleyFrictionTorqueNm: number; // N·m when non-ideal
  pulleyRadiusM: number; // m
}

export interface ForcePairVector {
  id: string;
  symbol: string;
  label: string;
  onObject: 'A' | 'B' | 'Earth' | 'Table' | 'Segment' | 'Pulley';
  agent: string;
  fx: number; // N
  fy: number; // N
  magnitude: number; // N
  angleDeg: number; // standard math angle (+x = 0, +y = 90)
  colorHex: string;
  pairId?: string; // links F_{A on B} and F_{B on A}
  isThirdLawMember?: boolean;
  isInternal?: boolean;
}

export interface RopeSegmentState {
  index: number;
  sNormalized: number; // 0 at load end, 1 at pull/ceiling end
  tLowerN: number; // tension exerted by segment below / behind
  tUpperN: number; // tension exerted by segment above / ahead
  tMidN: number; // average tension at segment center
  segmentMassKg: number;
  netForceN: number;
}

export interface PairedDiagramArrow {
  id: string;
  symbol: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  colorHex: string;
  isThirdLawMember: boolean;
}

export interface PairedFbdBox {
  objectTitle: string;
  dotX: number;
  dotY: number;
  accentHex: string;
  arrows: PairedDiagramArrow[];
}

export interface TensionGraphPoint {
  s: number; // 0..1
  x: number; // SVG x
  y: number; // SVG y
  tensionN: number;
}

export interface Newton23DiagramLayout {
  kind: 'paired_fbd' | 'tension_profile' | 'pulley_compare';
  width: number;
  height: number;
  boxes: PairedFbdBox[];
  pairConnector?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
  };
  tensionCurve?: TensionGraphPoint[];
  probePoint?: TensionGraphPoint;
  tMaxAxisN?: number;
  pulleyBars?: {
    labelA: string;
    valueA: number;
    labelB: string;
    valueB: number;
    axleLoadN: number;
    isEqual: boolean;
  };
}

export interface ComparisonRow {
  metric: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  relation: string;
}

export interface Newton23Evaluation {
  mode: Newton23Mode;
  headlineSummary: string;
  thirdLawStatus: string;
  forcesA: ForcePairVector[];
  forcesB: ForcePairVector[];
  pairMagAonB: number;
  pairMagBonA: number;
  pairEqualVerified: boolean;

  // Kinematics & COM
  accelA_x: number;
  accelB_x: number;
  accelCom_x: number;
  posA_x: number;
  posB_x: number;
  posCom_x: number;
  netExternalForceX: number;
  netInternalForceSumX: number;

  // String tension (Mode 3)
  segments: RopeSegmentState[];
  tensionBottomN: number;
  tensionMidN: number;
  tensionTopN: number;
  tensionDeltaN: number;
  isTensionUniform: boolean;
  ropeAccelMs2: number;

  // Pulley (Mode 4)
  pulleyAccelMs2: number;
  pulleyTensionAN: number;
  pulleyTensionBN: number;
  pulleyTensionDiffN: number;
  pulleyAxleForceN: number;
  pulleyAngleRad: number;
  pulleyDispM: number;

  // Pedagogical outputs (Skills 1.A, 2.C, 3.C)
  diagramLayout: Newton23DiagramLayout;
  comparisonRows: ComparisonRow[];
  equations: string[];
  justificationSteps: {
    step: string;
    detail: string;
  }[];
}

export interface Newton23Record {
  id: string;
  modeLabel: string;
  setupSummary: string;
  qtyALabel: string;
  qtyAValue: string;
  qtyBLabel: string;
  qtyBValue: string;
  keyResult: string;
}

export interface Newton23ClaimQuestion {
  id: string;
  ekCode: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

export const TOPIC_23_CLAIM_QUESTIONS: Newton23ClaimQuestion[] = [
  {
    id: 'q-unequal-mass-pair',
    ekCode: '2.3.A.1',
    prompt:
      'A 2 kg cart A pushes an 8 kg cart B to the right on a frictionless track so both accelerate together. How does the magnitude of the force A exerts on B compare to the force B exerts on A?',
    options: [
      { id: 'a', text: '|F_A on B| > |F_B on A| because A drives B forward.' },
      { id: 'b', text: '|F_A on B| = |F_B on A| strictly, regardless of mass or acceleration.' },
      { id: 'c', text: '|F_A on B| < |F_B on A| because cart B has 4x greater mass.' },
    ],
    correctId: 'b',
    explanation:
      'By Newton’s third law (2.3.A.1), F_A on B = -F_B on A holds at every instant regardless of unequal masses or whether the objects accelerate. Different masses change accelerations, not the interaction force magnitudes.',
  },
  {
    id: 'q-book-earth-pair',
    ekCode: '2.3.A.1',
    prompt:
      'A textbook rests motionless on a horizontal lab table. Which force is the Newton’s third-law pair to the downward gravitational force exerted by Earth on the book?',
    options: [
      { id: 'a', text: 'The upward normal force exerted by the table on the book.' },
      { id: 'b', text: 'The upward gravitational force exerted by the book on Earth.' },
      { id: 'c', text: 'The downward normal force exerted by the book on the table.' },
    ],
    correctId: 'b',
    explanation:
      'A third-law pair always acts on two DIFFERENT objects and shares the same physical interaction type. Earth pulls down on the book, so the book pulls up on Earth with equal gravitational force. Normal force and weight both act on the book and are not a third-law pair.',
  },
  {
    id: 'q-internal-com',
    ekCode: '2.3.A.2',
    prompt:
      'Two carts on a frictionless horizontal track are pushed apart by a compressed internal spring (no external horizontal forces). How does the center of mass of the two-cart system move?',
    options: [
      { id: 'a', text: 'The COM accelerates toward the lighter cart because it moves faster.' },
      { id: 'b', text: 'The COM accelerates toward the heavier cart because it carries more inertia.' },
      { id: 'c', text: 'The COM acceleration remains zero; internal spring forces cancel for the system.' },
    ],
    correctId: 'c',
    explanation:
      'By EK 2.3.A.2, interactions between objects within a system (internal forces) form canceling third-law pairs (F_A on B + F_B on A = 0) and cannot alter the acceleration of the system’s center of mass.',
  },
  {
    id: 'q-massive-rope-pulley',
    ekCode: '2.3.A.3.i–iv',
    prompt:
      'A heavy uniform rope of mass m_rope hangs vertically supporting a block of mass m_load. How does tension at the top of the rope compare to tension at the bottom?',
    options: [
      { id: 'a', text: 'T_top > T_bot because upper segments must support both the load and the rope mass below them.' },
      { id: 'b', text: 'T_top = T_bot because tension is always uniform in every physical rope.' },
      { id: 'c', text: 'T_top < T_bot because gravity pulls hardest near the bottom load.' },
    ],
    correctId: 'a',
    explanation:
      'Only an IDEAL (massless) string has identical tension at all points (2.3.A.3.i–ii). In a string with nonnegligible mass (2.3.A.3.iii), T(s) = (m_load + s·m_rope)g increases from bottom to top.',
  },
];

export function createDefaultNewton23Params(mode: Newton23Mode = 'action_reaction'): Newton23Params {
  return {
    mode,
    simTimeS: 0,
    arPreset: 'contact_push',
    massA: 3.0,
    massB: 7.0,
    appliedForceN: 40,
    highlightThirdLawPair: true,

    internalForceAmpN: 24,
    externalForceN: 0,
    showSystemBoundary: true,

    stringOrientation: 'vertical_hanging',
    loadMassKg: 4.0,
    ropeMassKg: 3.0,
    verticalAccelMs2: 0,
    horizontalPullN: 35,
    segmentCount: 7,
    probeSegmentIndex: 3,

    pulleyPreset: 'atwood',
    pulleyMassA: 3.0,
    pulleyMassB: 5.0,
    isIdealPulley: true,
    pulleyWheelMassKg: 4.0,
    pulleyFrictionTorqueNm: 0.4,
    pulleyRadiusM: 0.25,
  };
}

function makeForce(
  id: string,
  symbol: string,
  label: string,
  onObject: ForcePairVector['onObject'],
  agent: string,
  fx: number,
  fy: number,
  colorHex: string,
  opts?: { pairId?: string; isThirdLawMember?: boolean; isInternal?: boolean }
): ForcePairVector {
  const magnitude = Math.hypot(fx, fy);
  const angleDeg = magnitude > 1e-6 ? (Math.atan2(fy, fx) * 180) / Math.PI : 0;
  return {
    id,
    symbol,
    label,
    onObject,
    agent,
    fx,
    fy,
    magnitude,
    angleDeg,
    colorHex,
    pairId: opts?.pairId,
    isThirdLawMember: opts?.isThirdLawMember,
    isInternal: opts?.isInternal,
  };
}

function buildPairedFbdLayout(
  titleA: string,
  forcesA: ForcePairVector[],
  titleB: string,
  forcesB: ForcePairVector[],
  connectorLabel?: string
): Newton23DiagramLayout {
  const width = 320;
  const height = 186;
  const leftDot = { x: 84, y: 96 };
  const rightDot = { x: 236, y: 96 };

  const allMags = [...forcesA, ...forcesB].map(f => f.magnitude).filter(m => m > 0.01);
  const maxMag = Math.max(10, ...allMags);
  const maxLen = 46;
  const minLen = 20;

  const mapForces = (
    forces: ForcePairVector[],
    dotX: number,
    dotY: number
  ): PairedDiagramArrow[] => {
    // Group collinear angles so parallel forces draw side-by-side without overlapping
    const buckets = new Map<number, ForcePairVector[]>();
    for (const f of forces) {
      if (f.magnitude < 0.05) continue;
      const key = Math.round(((f.angleDeg % 360) + 360) % 360 / 12) * 12;
      const list = buckets.get(key) || [];
      list.push(f);
      buckets.set(key, list);
    }

    const arrows: PairedDiagramArrow[] = [];
    for (const f of forces) {
      if (f.magnitude < 0.05) continue;
      const key = Math.round(((f.angleDeg % 360) + 360) % 360 / 12) * 12;
      const group = buckets.get(key) || [f];
      const idx = group.indexOf(f);
      const offsetPx = (idx - (group.length - 1) / 2) * 11;

      const rad = (f.angleDeg * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = -Math.sin(rad); // SVG y points down
      const px = -uy;
      const py = ux;

      const len = minLen + ((maxLen - minLen) * Math.min(f.magnitude, maxMag)) / maxMag;
      const x1 = dotX + px * offsetPx;
      const y1 = dotY + py * offsetPx;
      const x2 = x1 + ux * len;
      const y2 = y1 + uy * len;

      const labelDist = len + 13;
      const rawLx = x1 + ux * labelDist + (Math.abs(ux) < 0.25 ? (offsetPx >= 0 ? 14 : -14) : 0);
      const rawLy = y1 + uy * labelDist + (Math.abs(uy) < 0.25 ? -9 : 0);

      arrows.push({
        id: f.id,
        symbol: f.symbol,
        x1,
        y1,
        x2,
        y2,
        labelX: Math.max(32, Math.min(width - 32, rawLx)),
        labelY: Math.max(24, Math.min(height - 16, rawLy)),
        colorHex: f.colorHex,
        isThirdLawMember: Boolean(f.isThirdLawMember),
      });
    }
    return arrows;
  };

  const arrowsA = mapForces(forcesA, leftDot.x, leftDot.y);
  const arrowsB = mapForces(forcesB, rightDot.x, rightDot.y);

  const pairA = arrowsA.find(a => a.isThirdLawMember);
  const pairB = arrowsB.find(a => a.isThirdLawMember);

  return {
    kind: 'paired_fbd',
    width,
    height,
    boxes: [
      { objectTitle: titleA, dotX: leftDot.x, dotY: leftDot.y, accentHex: '#34d399', arrows: arrowsA },
      { objectTitle: titleB, dotX: rightDot.x, dotY: rightDot.y, accentHex: '#38bdf8', arrows: arrowsB },
    ],
    pairConnector:
      pairA && pairB && connectorLabel
        ? {
            x1: pairA.x2,
            y1: pairA.y2,
            x2: pairB.x2,
            y2: pairB.y2,
            label: connectorLabel,
          }
        : undefined,
  };
}

export function evaluateNewton23(params: Newton23Params): Newton23Evaluation {
  const g = GRAVITY_G;

  // =========================================================================
  // MODE 1: PAIRED ACTION-REACTION FORCES (EK 2.3.A.1)
  // =========================================================================
  if (params.mode === 'action_reaction') {
    const mA = Math.max(0.5, params.massA);
    const mB = Math.max(0.5, params.massB);
    const t = Math.max(0, params.simTimeS);

    if (params.arPreset === 'contact_push') {
      const fPush = Math.max(0, params.appliedForceN);
      const a = fPush / (mA + mB);
      const fContact = mB * a; // F_{A on B} = +fContact, F_{B on A} = -fContact
      const disp = Math.min(2.2, 0.5 * a * t * t * 0.45);
      const posA = -0.95 + disp;
      const posB = 0.05 + disp;
      const posCom = (mA * posA + mB * posB) / (mA + mB);

      const forcesA: ForcePairVector[] = [
        makeForce('a-push', 'F_push', 'External Push on A', 'A', 'Hand / Thruster', fPush, 0, '#10b981'),
        makeForce('a-from-b', 'F_B on A', 'Contact Force: B on A', 'A', 'Block B', -fContact, 0, '#f43f5e', {
          pairId: 'contact-ab',
          isThirdLawMember: true,
        }),
        makeForce('a-fn', 'F_N,A', 'Normal: Track on A', 'A', 'Track', 0, mA * g, '#38bdf8'),
        makeForce('a-fg', 'F_g,A', 'Gravity: Earth on A', 'A', 'Earth', 0, -mA * g, '#f59e0b'),
      ];

      const forcesB: ForcePairVector[] = [
        makeForce('b-from-a', 'F_A on B', 'Contact Force: A on B', 'B', 'Block A', fContact, 0, '#f43f5e', {
          pairId: 'contact-ab',
          isThirdLawMember: true,
        }),
        makeForce('b-fn', 'F_N,B', 'Normal: Track on B', 'B', 'Track', 0, mB * g, '#38bdf8'),
        makeForce('b-fg', 'F_g,B', 'Gravity: Earth on B', 'B', 'Earth', 0, -mB * g, '#f59e0b'),
      ];

      return {
        mode: params.mode,
        headlineSummary: `Contact Push: |F_A on B| = |F_B on A| = ${fContact.toFixed(1)} N even with m_A (${mA.toFixed(1)} kg) ≠ m_B (${mB.toFixed(1)} kg)`,
        thirdLawStatus: `VERIFIED: F_A on B (+${fContact.toFixed(1)} N) = -F_B on A (-${fContact.toFixed(1)} N)`,
        forcesA,
        forcesB,
        pairMagAonB: fContact,
        pairMagBonA: fContact,
        pairEqualVerified: true,
        accelA_x: a,
        accelB_x: a,
        accelCom_x: a,
        posA_x: posA,
        posB_x: posB,
        posCom_x: posCom,
        netExternalForceX: fPush,
        netInternalForceSumX: 0,
        segments: [],
        tensionBottomN: 0,
        tensionMidN: 0,
        tensionTopN: 0,
        tensionDeltaN: 0,
        isTensionUniform: true,
        ropeAccelMs2: 0,
        pulleyAccelMs2: 0,
        pulleyTensionAN: 0,
        pulleyTensionBN: 0,
        pulleyTensionDiffN: 0,
        pulleyAxleForceN: 0,
        pulleyAngleRad: 0,
        pulleyDispM: 0,
        diagramLayout: buildPairedFbdLayout(
          `Block A (${mA.toFixed(1)} kg)`,
          forcesA,
          `Block B (${mB.toFixed(1)} kg)`,
          forcesB,
          '3rd Law Pair'
        ),
        comparisonRows: [
          {
            metric: 'Interaction Force',
            leftLabel: 'F_B on A',
            leftValue: `-${fContact.toFixed(2)} N`,
            rightLabel: 'F_A on B',
            rightValue: `+${fContact.toFixed(2)} N`,
            relation: 'Equal |F|, Opposite Sign',
          },
          {
            metric: 'Net Force on Object',
            leftLabel: 'ΣF_A',
            leftValue: `${(fPush - fContact).toFixed(2)} N`,
            rightLabel: 'ΣF_B',
            rightValue: `${fContact.toFixed(2)} N`,
            relation: `Ratio = m_A/m_B = ${(mA / mB).toFixed(2)}`,
          },
          {
            metric: 'Acceleration',
            leftLabel: 'a_A',
            leftValue: `${a.toFixed(2)} m/s²`,
            rightLabel: 'a_B',
            rightValue: `${a.toFixed(2)} m/s²`,
            relation: 'Shared contact motion',
          },
        ],
        equations: [
          `a = F_push / (m_A + m_B) = ${fPush.toFixed(1)} / ${(mA + mB).toFixed(1)} = ${a.toFixed(2)} m/s²`,
          `F_A on B = m_B · a = (${mB.toFixed(1)})(${a.toFixed(2)}) = +${fContact.toFixed(2)} N`,
          `F_B on A = -F_A on B = -${fContact.toFixed(2)} N   (Newton's 3rd Law, EK 2.3.A.1)`,
          `Check Block A: ΣF_A = F_push + F_B on A = ${(fPush - fContact).toFixed(2)} N = m_A · a`,
        ],
        justificationSteps: [
          {
            step: '1. Identify the Interaction Pair (EK 2.3.A.1)',
            detail: `Blocks A and B touch at their shared interface. Block A pushes B forward with +${fContact.toFixed(1)} N while B simultaneously pushes A backward with -${fContact.toFixed(1)} N.`,
          },
          {
            step: '2. Why Accelerating Does Not Break the 3rd Law',
            detail: `Even though both blocks accelerate at ${a.toFixed(2)} m/s², the contact pair remains strictly equal and opposite. Block A accelerates forward because external F_push (${fPush.toFixed(1)} N) exceeds |F_B on A| (${fContact.toFixed(1)} N).`,
          },
          {
            step: '3. Distinct Objects Never Cancel on One FBD',
            detail: `F_A on B acts ONLY on Block B; F_B on A acts ONLY on Block A. Because they act on different bodies, they never cancel each other on a single-object FBD.`,
          },
        ],
      };
    }

    if (params.arPreset === 'ice_pushoff') {
      const fInt = Math.max(4, params.appliedForceN);
      const aA = -fInt / mA;
      const aB = fInt / mB;
      // Smooth spring-release separation over simTimeS
      const tau = Math.min(t, 1.8);
      const dispA = Math.max(-2.1, 0.5 * aA * tau * tau * 0.28);
      const dispB = Math.min(2.1, 0.5 * aB * tau * tau * 0.28);
      const initCom = (mA * -0.55 + mB * 0.55) / (mA + mB);
      const posA = -0.55 + dispA;
      const posB = 0.55 + dispB;
      const posCom = (mA * posA + mB * posB) / (mA + mB);

      const forcesA: ForcePairVector[] = [
        makeForce('a-from-b', 'F_B on A', 'Push-Off: B on A', 'A', 'Cart B', -fInt, 0, '#f43f5e', {
          pairId: 'pushoff-ab',
          isThirdLawMember: true,
        }),
        makeForce('a-fn', 'F_N,A', 'Normal: Rail on A', 'A', 'Rail', 0, mA * g, '#38bdf8'),
        makeForce('a-fg', 'F_g,A', 'Gravity: Earth on A', 'A', 'Earth', 0, -mA * g, '#f59e0b'),
      ];

      const forcesB: ForcePairVector[] = [
        makeForce('b-from-a', 'F_A on B', 'Push-Off: A on B', 'B', 'Cart A', fInt, 0, '#f43f5e', {
          pairId: 'pushoff-ab',
          isThirdLawMember: true,
        }),
        makeForce('b-fn', 'F_N,B', 'Normal: Rail on B', 'B', 'Rail', 0, mB * g, '#38bdf8'),
        makeForce('b-fg', 'F_g,B', 'Gravity: Earth on B', 'B', 'Earth', 0, -mB * g, '#f59e0b'),
      ];

      return {
        mode: params.mode,
        headlineSummary: `Frictionless Push-Off: Equal ${fInt.toFixed(1)} N pair yields |a_A| = ${Math.abs(aA).toFixed(2)} vs |a_B| = ${aB.toFixed(2)} m/s² (a_cm = 0)`,
        thirdLawStatus: `VERIFIED: |F_A on B| = |F_B on A| = ${fInt.toFixed(1)} N, while |a_A|/|a_B| = m_B/m_A = ${(mB / mA).toFixed(2)}`,
        forcesA,
        forcesB,
        pairMagAonB: fInt,
        pairMagBonA: fInt,
        pairEqualVerified: true,
        accelA_x: aA,
        accelB_x: aB,
        accelCom_x: 0,
        posA_x: posA,
        posB_x: posB,
        posCom_x: Math.abs(posCom - initCom) < 1e-6 ? initCom : posCom,
        netExternalForceX: 0,
        netInternalForceSumX: 0,
        segments: [],
        tensionBottomN: 0,
        tensionMidN: 0,
        tensionTopN: 0,
        tensionDeltaN: 0,
        isTensionUniform: true,
        ropeAccelMs2: 0,
        pulleyAccelMs2: 0,
        pulleyTensionAN: 0,
        pulleyTensionBN: 0,
        pulleyTensionDiffN: 0,
        pulleyAxleForceN: 0,
        pulleyAngleRad: 0,
        pulleyDispM: 0,
        diagramLayout: buildPairedFbdLayout(
          `Cart A (${mA.toFixed(1)} kg)`,
          forcesA,
          `Cart B (${mB.toFixed(1)} kg)`,
          forcesB,
          'Equal & Opposite'
        ),
        comparisonRows: [
          {
            metric: 'Push-Off Force',
            leftLabel: 'F_B on A',
            leftValue: `-${fInt.toFixed(1)} N`,
            rightLabel: 'F_A on B',
            rightValue: `+${fInt.toFixed(1)} N`,
            relation: 'Identical magnitude',
          },
          {
            metric: 'Recoil Acceleration',
            leftLabel: 'a_A',
            leftValue: `${aA.toFixed(2)} m/s²`,
            rightLabel: 'a_B',
            rightValue: `+${aB.toFixed(2)} m/s²`,
            relation: 'Lighter cart accelerates more',
          },
          {
            metric: 'System COM Accel',
            leftLabel: 'ΣF_ext',
            leftValue: '0.00 N',
            rightLabel: 'a_cm',
            rightValue: '0.00 m/s²',
            relation: 'Stationary COM (EK 2.3.A.2)',
          },
        ],
        equations: [
          `F_A on B = +${fInt.toFixed(1)} N,   F_B on A = -${fInt.toFixed(1)} N`,
          `a_A = F_B on A / m_A = ${aA.toFixed(2)} m/s²,   a_B = F_A on B / m_B = +${aB.toFixed(2)} m/s²`,
          `|a_A| / |a_B| = m_B / m_A = ${(mB / mA).toFixed(2)}`,
          `a_cm = (m_A a_A + m_B a_B) / (m_A + m_B) = 0.00 m/s²`,
        ],
        justificationSteps: [
          {
            step: '1. Equal Forces, Unequal Accelerations',
            detail: `Students often confuse larger recoil acceleration with a larger force. Both carts feel exactly ${fInt.toFixed(1)} N; Cart A accelerates at ${aA.toFixed(2)} m/s² vs Cart B at +${aB.toFixed(2)} m/s² solely because a = F/m.`,
          },
          {
            step: '2. Zero Center-of-Mass Shift (EK 2.3.A.2)',
            detail: `Weighted mass-acceleration products cancel identically: m_A a_A + m_B a_B = (-${fInt.toFixed(1)}) + (+${fInt.toFixed(1)}) = 0 N, keeping the system COM fixed.`,
          },
        ],
      };
    }

    // Preset 3: book_earth (Classic AP 3rd-Law Misconception Buster)
    const weight = mA * g;
    const forcesBook: ForcePairVector[] = [
      makeForce('book-fn', 'F_T on Bk', 'Normal: Table on Book (NOT pair to F_g!)', 'A', 'Table', 0, weight, '#38bdf8'),
      makeForce('book-fg', 'F_E on Bk', 'Gravity: Earth on Book', 'A', 'Earth', 0, -weight, '#f43f5e', {
        pairId: 'grav-book-earth',
        isThirdLawMember: true,
      }),
    ];
    const forcesEarth: ForcePairVector[] = [
      makeForce('earth-fg', 'F_Bk on E', 'Gravity: Book on Earth', 'Earth', 'Book', 0, weight, '#f43f5e', {
        pairId: 'grav-book-earth',
        isThirdLawMember: true,
      }),
    ];

    return {
      mode: params.mode,
      headlineSummary: `Book & Earth Pair: F_Earth on Book (-${weight.toFixed(1)} N) pairs with F_Book on Earth (+${weight.toFixed(1)} N), NOT F_N!`,
      thirdLawStatus: `VERIFIED: True 3rd-law pair acts on Book & Earth (both gravitational = ${weight.toFixed(1)} N)`,
      forcesA: forcesBook,
      forcesB: forcesEarth,
      pairMagAonB: weight,
      pairMagBonA: weight,
      pairEqualVerified: true,
      accelA_x: 0,
      accelB_x: 0,
      accelCom_x: 0,
      posA_x: 0,
      posB_x: 0,
      posCom_x: 0,
      netExternalForceX: 0,
      netInternalForceSumX: 0,
      segments: [],
      tensionBottomN: 0,
      tensionMidN: 0,
      tensionTopN: 0,
      tensionDeltaN: 0,
      isTensionUniform: true,
      ropeAccelMs2: 0,
      pulleyAccelMs2: 0,
      pulleyTensionAN: 0,
      pulleyTensionBN: 0,
      pulleyTensionDiffN: 0,
      pulleyAxleForceN: 0,
      pulleyAngleRad: 0,
      pulleyDispM: 0,
      diagramLayout: buildPairedFbdLayout(
        `Book (${mA.toFixed(1)} kg)`,
        forcesBook,
        'Planet Earth',
        forcesEarth,
        'Gravity Pair'
      ),
      comparisonRows: [
        {
          metric: 'True Gravity Pair',
          leftLabel: 'F_E on Bk',
          leftValue: `-${weight.toFixed(1)} N`,
          rightLabel: 'F_Bk on E',
          rightValue: `+${weight.toFixed(1)} N`,
          relation: 'Same interaction, 2 objects',
        },
        {
          metric: 'True Contact Pair',
          leftLabel: 'F_Table on Bk',
          leftValue: `+${weight.toFixed(1)} N`,
          rightLabel: 'F_Bk on Table',
          rightValue: `-${weight.toFixed(1)} N`,
          relation: 'Separate normal pair',
        },
        {
          metric: 'Why F_N ≠ Pair of F_g',
          leftLabel: 'Objects',
          leftValue: 'Both on Book',
          rightLabel: 'Types',
          rightValue: 'Normal vs Gravity',
          relation: 'Equilibrium ≠ 3rd Law',
        },
      ],
      equations: [
        `Gravity Pair: F_Earth on Book = -${weight.toFixed(1)} N ĵ   ↔   F_Book on Earth = +${weight.toFixed(1)} N ĵ`,
        `Contact Pair: F_Table on Book = +${weight.toFixed(1)} N ĵ   ↔   F_Book on Table = -${weight.toFixed(1)} N ĵ`,
        `Equilibrium on Book: F_Table on Book + F_Earth on Book = 0 (Newton's 1st/2nd Law, NOT 3rd Law)`,
      ],
      justificationSteps: [
        {
          step: '1. AP Exam Classic Trap: Normal vs. Weight',
          detail: `F_Table on Book (+${weight.toFixed(1)} N) and F_Earth on Book (-${weight.toFixed(1)} N) happen to be equal and opposite only because the book is at rest on a level table—they both act on the SAME object (the book).`,
        },
        {
          step: '2. Swap Agent and Object to Find the True Pair (EK 2.3.A.1)',
          detail: `Swapping "Earth on Book" gives "Book on Earth": the book pulls planet Earth upward gravitationally with exactly +${weight.toFixed(1)} N. Earth's acceleration is tiny only because M_Earth ≈ 5.97 × 10²⁴ kg.`,
        },
      ],
    };
  }

  // =========================================================================
  // MODE 2: INTERNAL FORCES & SYSTEM CENTER OF MASS (EK 2.3.A.2)
  // =========================================================================
  if (params.mode === 'internal_com') {
    const mA = Math.max(0.5, params.massA);
    const mB = Math.max(0.5, params.massB);
    const totalM = mA + mB;
    const fExt = params.externalForceN;
    const fIntAmp = params.internalForceAmpN;
    const t = Math.max(0, params.simTimeS);

    // Internal harmonic oscillation between Cart A and Cart B (zero net internal force at every t!)
    const omega = 3.2; // rad/s
    const fIntNow = fIntAmp * Math.cos(omega * t); // force A exerts on B (+x pushes B right, -x pulls B left)
    const aCom = fExt / totalM;
    // External thruster acts on Cart A (or evenly on system), plus internal pair (+fIntNow on B, -fIntNow on A)
    const aA = (fExt - fIntNow) / mA;
    const aB = fIntNow / mB;

    // Exact kinematics preserving x_cm(t) = x_cm0 + 0.5 * aCom * t^2
    // Relative displacement delta(t) = L0 + A_rel * (1 - cos(omega*t))
    const reducedM = (mA * mB) / totalM;
    const relAmp = Math.min(0.68, (fIntAmp / (reducedM * omega * omega)) * 0.65);
    const separation = 1.65 + relAmp * (1 - Math.cos(omega * t));
    const comDrift = Math.min(2.0, 0.5 * aCom * t * t * 0.42);
    const posCom = -0.8 + comDrift;
    const posA = posCom - (mB / totalM) * separation;
    const posB = posCom + (mA / totalM) * separation;

    const forcesA: ForcePairVector[] = [
      ...(Math.abs(fExt) > 0.1
        ? [makeForce('sys-ext', 'F_ext', 'External Thruster on A', 'A', 'External', fExt, 0, '#10b981')]
        : []),
      makeForce('int-b-on-a', 'F_B on A', 'Internal Spring: B on A', 'A', 'Cart B', -fIntNow, 0, '#f43f5e', {
        pairId: 'internal-spring',
        isThirdLawMember: true,
        isInternal: true,
      }),
      makeForce('int-fn-a', 'F_N,A', 'Normal on A', 'A', 'Track', 0, mA * g, '#38bdf8'),
      makeForce('int-fg-a', 'F_g,A', 'Gravity on A', 'A', 'Earth', 0, -mA * g, '#f59e0b'),
    ];

    const forcesB: ForcePairVector[] = [
      makeForce('int-a-on-b', 'F_A on B', 'Internal Spring: A on B', 'B', 'Cart A', fIntNow, 0, '#f43f5e', {
        pairId: 'internal-spring',
        isThirdLawMember: true,
        isInternal: true,
      }),
      makeForce('int-fn-b', 'F_N,B', 'Normal on B', 'B', 'Track', 0, mB * g, '#38bdf8'),
      makeForce('int-fg-b', 'F_g,B', 'Gravity on B', 'B', 'Earth', 0, -mB * g, '#f59e0b'),
    ];

    return {
      mode: params.mode,
      headlineSummary: `System {A+B}: Internal pair F_A on B + F_B on A = 0 N → a_cm = ${aCom.toFixed(2)} m/s² independent of internal spring`,
      thirdLawStatus: `INTERNAL CANCELLED: (+${fIntNow.toFixed(1)} N) + (${(-fIntNow).toFixed(1)} N) = 0.0 N inside {A+B}`,
      forcesA,
      forcesB,
      pairMagAonB: Math.abs(fIntNow),
      pairMagBonA: Math.abs(fIntNow),
      pairEqualVerified: true,
      accelA_x: aA,
      accelB_x: aB,
      accelCom_x: aCom,
      posA_x: posA,
      posB_x: posB,
      posCom_x: posCom,
      netExternalForceX: fExt,
      netInternalForceSumX: 0,
      segments: [],
      tensionBottomN: 0,
      tensionMidN: 0,
      tensionTopN: 0,
      tensionDeltaN: 0,
      isTensionUniform: true,
      ropeAccelMs2: 0,
      pulleyAccelMs2: 0,
      pulleyTensionAN: 0,
      pulleyTensionBN: 0,
      pulleyTensionDiffN: 0,
      pulleyAxleForceN: 0,
      pulleyAngleRad: 0,
      pulleyDispM: 0,
      diagramLayout: buildPairedFbdLayout(
        `Cart A (${mA.toFixed(1)} kg)`,
        forcesA,
        `Cart B (${mB.toFixed(1)} kg)`,
        forcesB,
        'Internal Pair (Sums to 0)'
      ),
      comparisonRows: [
        {
          metric: 'Instantaneous Internal Pair',
          leftLabel: 'F_B on A',
          leftValue: `${(-fIntNow).toFixed(1)} N`,
          rightLabel: 'F_A on B',
          rightValue: `${fIntNow >= 0 ? '+' : ''}${fIntNow.toFixed(1)} N`,
          relation: 'Sum = 0.00 N always',
        },
        {
          metric: 'Individual Cart Accel',
          leftLabel: 'a_A(t)',
          leftValue: `${aA.toFixed(2)} m/s²`,
          rightLabel: 'a_B(t)',
          rightValue: `${aB.toFixed(2)} m/s²`,
          relation: 'Oscillates strongly',
        },
        {
          metric: 'System COM Accel',
          leftLabel: 'F_ext / M',
          leftValue: `${aCom.toFixed(2)} m/s²`,
          rightLabel: '(m_A a_A + m_B a_B)/M',
          rightValue: `${((mA * aA + mB * aB) / totalM).toFixed(2)} m/s²`,
          relation: 'Unaffected by internal F',
        },
      ],
      equations: [
        `ΣF_int = F_A on B + F_B on A = (${fIntNow.toFixed(1)}) + (${(-fIntNow).toFixed(1)}) = 0 N`,
        `M_total · a_cm = ΣF_ext + ΣF_int = ${fExt.toFixed(1)} + 0 = ${fExt.toFixed(1)} N`,
        `a_cm = F_ext / (m_A + m_B) = ${fExt.toFixed(1)} / ${totalM.toFixed(1)} = ${aCom.toFixed(2)} m/s²`,
        `Weighted check: (m_A a_A + m_B a_B) / M = ${((mA * aA + mB * aB) / totalM).toFixed(2)} m/s²`,
      ],
      justificationSteps: [
        {
          step: '1. Internal Forces Form Canceled Pairs (EK 2.3.A.2)',
          detail: `Inside the {A + B} system boundary, the coil spring pushes Cart B with ${fIntNow.toFixed(1)} N and Cart A with ${(-fIntNow).toFixed(1)} N. Their vector sum is identically zero at every instant.`,
        },
        {
          step: '2. COM Follows Only External Forces',
          detail: `Even when Cart A and Cart B surge violently apart and back together, the golden COM marker responds ONLY to F_ext (${fExt.toFixed(1)} N), maintaining a_cm = ${aCom.toFixed(2)} m/s².`,
        },
        {
          step: '3. System Boundary Choice Matters',
          detail: `Toggle "System Boundary" off to view Cart A or B individually: for a single-cart system, the spring force crosses the boundary and IS an external force that accelerates that cart.`,
        },
      ],
    };
  }

  // =========================================================================
  // MODE 3: MACROSCOPIC TENSION & MICRO-SEGMENTS (EK 2.3.A.3, 2.3.A.3.i–iii)
  // =========================================================================
  if (params.mode === 'string_tension') {
    const mLoad = Math.max(0.5, params.loadMassKg);
    const mRope = Math.max(0, params.ropeMassKg);
    const nSeg = Math.max(5, Math.min(10, Math.round(params.segmentCount)));
    const probeIdx = Math.max(0, Math.min(nSeg - 1, Math.round(params.probeSegmentIndex)));
    const isIdeal = mRope < 0.001;

    let accel = 0;
    let factor = g;
    if (params.stringOrientation === 'vertical_hanging') {
      accel = params.verticalAccelMs2;
      factor = Math.max(0.2, g + accel);
    } else {
      const fPull = Math.max(2, params.horizontalPullN);
      accel = fPull / (mLoad + mRope);
      factor = accel;
    }

    const dm = mRope / nSeg;
    const segments: RopeSegmentState[] = [];
    for (let i = 0; i < nSeg; i++) {
      const sBot = i / nSeg;
      const sTop = (i + 1) / nSeg;
      const sMid = (i + 0.5) / nSeg;
      const tLowerN = (mLoad + sBot * mRope) * factor;
      const tUpperN = (mLoad + sTop * mRope) * factor;
      const tMidN = (mLoad + sMid * mRope) * factor;
      segments.push({
        index: i,
        sNormalized: sMid,
        tLowerN,
        tUpperN,
        tMidN,
        segmentMassKg: dm,
        netForceN: dm * accel,
      });
    }

    const tBot = mLoad * factor;
    const tTop = (mLoad + mRope) * factor;
    const tMid = (mLoad + 0.5 * mRope) * factor;
    const tDelta = tTop - tBot;
    const probeSeg = segments[probeIdx];

    // Build SVG tension profile T(s) vs s/L
    const width = 320;
    const height = 186;
    const padL = 46;
    const padR = 20;
    const padT = 22;
    const padB = 34;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const tMaxAxisN = Math.max(20, Math.ceil((tTop * 1.25) / 10) * 10);

    const curvePoints: TensionGraphPoint[] = [];
    for (let k = 0; k <= 20; k++) {
      const s = k / 20;
      const tVal = (mLoad + s * mRope) * factor;
      curvePoints.push({
        s,
        x: padL + s * plotW,
        y: padT + plotH * (1 - tVal / tMaxAxisN),
        tensionN: tVal,
      });
    }

    const probePoint: TensionGraphPoint = {
      s: probeSeg.sNormalized,
      x: padL + probeSeg.sNormalized * plotW,
      y: padT + plotH * (1 - probeSeg.tMidN / tMaxAxisN),
      tensionN: probeSeg.tMidN,
    };

    const isVert = params.stringOrientation === 'vertical_hanging';
    const forcesSeg: ForcePairVector[] = isVert
      ? [
          makeForce('seg-up', 'T_above', 'Upper Segment on dm_k', 'Segment', `Seg ${probeIdx + 2}`, 0, probeSeg.tUpperN, '#10b981', {
            pairId: 'seg-upper',
            isThirdLawMember: true,
          }),
          makeForce('seg-dn', 'T_below', 'Lower Segment on dm_k', 'Segment', `Seg ${probeIdx}`, 0, -probeSeg.tLowerN, '#38bdf8', {
            pairId: 'seg-lower',
            isThirdLawMember: true,
          }),
          ...(dm > 0.001
            ? [makeForce('seg-fg', 'dm·g', 'Weight of Segment dm_k', 'Segment', 'Earth', 0, -dm * g, '#f59e0b')]
            : []),
        ]
      : [
          makeForce('seg-ahead', 'T_ahead', 'Front Segment on dm_k', 'Segment', `Seg ${probeIdx + 2}`, probeSeg.tUpperN, 0, '#10b981', {
            pairId: 'seg-upper',
            isThirdLawMember: true,
          }),
          makeForce('seg-behind', 'T_behind', 'Rear Segment on dm_k', 'Segment', `Seg ${probeIdx}`, -probeSeg.tLowerN, 0, '#38bdf8', {
            pairId: 'seg-lower',
            isThirdLawMember: true,
          }),
        ];

    return {
      mode: params.mode,
      headlineSummary: isIdeal
        ? `Ideal String (m_rope = 0): Uniform tension T = ${tTop.toFixed(1)} N at all points (EK 2.3.A.3.i–ii)`
        : `Massive Rope (${mRope.toFixed(1)} kg): T varies from ${tBot.toFixed(1)} N (load end) to ${tTop.toFixed(1)} N (pull end) (EK 2.3.A.3.iii)`,
      thirdLawStatus: isIdeal
        ? `UNIFORM TENSION: T_top = T_mid = T_bot = ${tTop.toFixed(1)} N (ΔT = 0.0 N)`
        : `NON-UNIFORM TENSION: ΔT = T_top - T_bot = +${tDelta.toFixed(1)} N across rope mass`,
      forcesA: forcesSeg,
      forcesB: [],
      pairMagAonB: probeSeg.tUpperN,
      pairMagBonA: probeSeg.tUpperN,
      pairEqualVerified: true,
      accelA_x: isVert ? 0 : accel,
      accelB_x: isVert ? 0 : accel,
      accelCom_x: isVert ? 0 : accel,
      posA_x: 0,
      posB_x: 0,
      posCom_x: 0,
      netExternalForceX: isVert ? 0 : tTop,
      netInternalForceSumX: 0,
      segments,
      tensionBottomN: tBot,
      tensionMidN: tMid,
      tensionTopN: tTop,
      tensionDeltaN: tDelta,
      isTensionUniform: isIdeal,
      ropeAccelMs2: accel,
      pulleyAccelMs2: 0,
      pulleyTensionAN: 0,
      pulleyTensionBN: 0,
      pulleyTensionDiffN: 0,
      pulleyAxleForceN: 0,
      pulleyAngleRad: 0,
      pulleyDispM: 0,
      diagramLayout: {
        kind: 'tension_profile',
        width,
        height,
        boxes: [],
        tensionCurve: curvePoints,
        probePoint,
        tMaxAxisN,
      },
      comparisonRows: [
        {
          metric: 'Load End vs Pull End',
          leftLabel: isVert ? 'T_bottom (s=0)' : 'T_block (s=0)',
          leftValue: `${tBot.toFixed(2)} N`,
          rightLabel: isVert ? 'T_top (s=L)' : 'T_pull (s=L)',
          rightValue: `${tTop.toFixed(2)} N`,
          relation: isIdeal ? 'Identical (Ideal)' : `ΔT = +${tDelta.toFixed(2)} N`,
        },
        {
          metric: `Probe Segment #${probeIdx + 1}`,
          leftLabel: isVert ? 'T_below' : 'T_rear',
          leftValue: `${probeSeg.tLowerN.toFixed(2)} N`,
          rightLabel: isVert ? 'T_above' : 'T_front',
          rightValue: `${probeSeg.tUpperN.toFixed(2)} N`,
          relation: `dm = ${dm.toFixed(2)} kg`,
        },
        {
          metric: 'Rope Model Classification',
          leftLabel: 'm_rope',
          leftValue: `${mRope.toFixed(1)} kg`,
          rightLabel: 'Status',
          rightValue: isIdeal ? 'Ideal (2.3.A.3.i)' : 'Massive (2.3.A.3.iii)',
          relation: isIdeal ? 'dT/ds = 0' : `dT/ds = +${tDelta.toFixed(1)} N/L`,
        },
      ],
      equations: isVert
        ? [
            `T(s) = (m_load + s · m_rope)(g + a_y) = (${mLoad.toFixed(1)} + s · ${mRope.toFixed(1)})(${factor.toFixed(2)})`,
            `T_bot = ${tBot.toFixed(2)} N,   T_mid = ${tMid.toFixed(2)} N,   T_top = ${tTop.toFixed(2)} N`,
            `Segment #${probeIdx + 1}: T_above - T_below - (dm)g = (dm)a_y  →  ΔT_seg = ${(probeSeg.tUpperN - probeSeg.tLowerN).toFixed(2)} N`,
          ]
        : [
            `a = F_pull / (m_load + m_rope) = ${tTop.toFixed(1)} / ${(mLoad + mRope).toFixed(1)} = ${accel.toFixed(2)} m/s²`,
            `T(s) = (m_load + s · m_rope) · a   →   T_block = ${tBot.toFixed(2)} N, T_pull = ${tTop.toFixed(2)} N`,
            `Segment #${probeIdx + 1}: T_front - T_rear = (dm)a = ${(probeSeg.tUpperN - probeSeg.tLowerN).toFixed(2)} N`,
          ],
      justificationSteps: [
        {
          step: '1. Microscopic Origin of Tension (EK 2.3.A.3)',
          detail: `Every infinitesimal segment dm_k pulls its neighboring segments via equal-and-opposite Newton’s third-law pairs (T_k on k+1 = -T_k+1 on k), transmitting force end-to-end.`,
        },
        {
          step: isIdeal
            ? '2. Ideal String Approximation (EK 2.3.A.3.i–ii)'
            : '2. Massive String Tension Gradient (EK 2.3.A.3.iii)',
          detail: isIdeal
            ? `With m_rope = 0, each segment has dm = 0 so T_above - T_below = 0. Thus tension is strictly uniform (${tTop.toFixed(1)} N) at every point along the string.`
            : `Because m_rope = ${mRope.toFixed(1)} kg is nonnegligible, each segment dm = ${dm.toFixed(2)} kg requires a net force (or weight support), causing T_above (${probeSeg.tUpperN.toFixed(1)} N) to exceed T_below (${probeSeg.tLowerN.toFixed(1)} N).`,
        },
      ],
    };
  }

  // =========================================================================
  // MODE 4: IDEAL VS NON-IDEAL PULLEY (EK 2.3.A.3.iv)
  // =========================================================================
  const mA = Math.max(0.5, params.pulleyMassA);
  const mB = Math.max(0.5, params.pulleyMassB);
  const R = Math.max(0.1, params.pulleyRadiusM);
  const mPulley = params.isIdealPulley ? 0 : Math.max(0.5, params.pulleyWheelMassKg);
  const tauF = params.isIdealPulley ? 0 : Math.max(0, params.pulleyFrictionTorqueNm);
  const equivPulleyMass = 0.5 * mPulley; // I / R^2 = (1/2 m_p R^2) / R^2

  let drivingForce = 0;
  let accel = 0;
  let tA = 0;
  let tB = 0;
  let axleForceN = 0;

  if (params.pulleyPreset === 'atwood') {
    // Positive direction: B descends, A rises
    drivingForce = (mB - mA) * g;
    const sign = Math.sign(drivingForce);
    const fFricEquiv = tauF / R;
    if (Math.abs(drivingForce) <= fFricEquiv + 1e-6) {
      accel = 0;
      tA = mA * g;
      tB = mB * g;
    } else {
      const netDrive = Math.abs(drivingForce) - fFricEquiv;
      accel = sign * (netDrive / (mA + mB + equivPulleyMass));
      tA = mA * (g + accel);
      tB = mB * (g - accel);
    }
    axleForceN = tA + tB + mPulley * g;
  } else {
    // Modified Atwood: A slides on frictionless horizontal table, B hangs vertically
    drivingForce = mB * g;
    const fFricEquiv = tauF / R;
    if (drivingForce <= fFricEquiv + 1e-6) {
      accel = 0;
      tA = 0;
      tB = mB * g;
    } else {
      accel = (drivingForce - fFricEquiv) / (mA + mB + equivPulleyMass);
      tA = mA * accel;
      tB = mB * (g - accel);
    }
    // Axle supports vector sum of horizontal -T_A and vertical -(T_B + m_p g)
    axleForceN = Math.hypot(tA, tB + mPulley * g);
  }

  const t = Math.max(0, params.simTimeS);
  const disp = Math.max(-1.1, Math.min(1.1, 0.5 * accel * t * t * 0.55));
  const angleRad = disp / R;
  const tDiff = Math.abs(tB - tA);
  const isEqualTension = tDiff < 0.02;

  const forcesA: ForcePairVector[] =
    params.pulleyPreset === 'atwood'
      ? [
          makeForce('p-ta', 'T_A', 'Tension on A', 'A', 'String', 0, tA, '#10b981', { isThirdLawMember: true }),
          makeForce('p-fga', 'F_g,A', 'Gravity on A', 'A', 'Earth', 0, -mA * g, '#f59e0b'),
        ]
      : [
          makeForce('p-ta', 'T_A', 'Tension on A', 'A', 'String', tA, 0, '#10b981', { isThirdLawMember: true }),
          makeForce('p-fna', 'F_N,A', 'Normal on A', 'A', 'Table', 0, mA * g, '#38bdf8'),
          makeForce('p-fga', 'F_g,A', 'Gravity on A', 'A', 'Earth', 0, -mA * g, '#f59e0b'),
        ];

  const forcesB: ForcePairVector[] = [
    makeForce('p-tb', 'T_B', 'Tension on B', 'B', 'String', 0, tB, '#38bdf8', { isThirdLawMember: true }),
    makeForce('p-fgb', 'F_g,B', 'Gravity on B', 'B', 'Earth', 0, -mB * g, '#f59e0b'),
  ];

  return {
    mode: params.mode,
    headlineSummary: params.isIdealPulley
      ? `Ideal Pulley (m_p = 0, frictionless): Redirects rope with T_A = T_B = ${tA.toFixed(1)} N (EK 2.3.A.3.iv)`
      : `Real Pulley (m_p = ${mPulley.toFixed(1)} kg, τ_f = ${tauF.toFixed(1)} N·m): T_B (${tB.toFixed(1)} N) ≠ T_A (${tA.toFixed(1)} N), ΔT = ${tDiff.toFixed(1)} N`,
    thirdLawStatus: isEqualTension
      ? `IDEAL PULLEY VERIFIED: T_A = T_B = ${tA.toFixed(2)} N (redirects force without losing tension)`
      : `NON-IDEAL DIFFERENCE: |T_B - T_A| = ${tDiff.toFixed(2)} N required to spin pulley & overcome axle friction`,
    forcesA,
    forcesB,
    pairMagAonB: tA,
    pairMagBonA: tB,
    pairEqualVerified: isEqualTension,
    accelA_x: accel,
    accelB_x: accel,
    accelCom_x: accel,
    posA_x: disp,
    posB_x: disp,
    posCom_x: 0,
    netExternalForceX: drivingForce,
    netInternalForceSumX: 0,
    segments: [],
    tensionBottomN: tA,
    tensionMidN: 0.5 * (tA + tB),
    tensionTopN: tB,
    tensionDeltaN: tDiff,
    isTensionUniform: isEqualTension,
    ropeAccelMs2: accel,
    pulleyAccelMs2: accel,
    pulleyTensionAN: tA,
    pulleyTensionBN: tB,
    pulleyTensionDiffN: tDiff,
    pulleyAxleForceN: axleForceN,
    pulleyAngleRad: angleRad,
    pulleyDispM: disp,
    diagramLayout: {
      kind: 'pulley_compare',
      width: 320,
      height: 186,
      boxes: [],
      pulleyBars: {
        labelA: 'T_A (Side A)',
        valueA: tA,
        labelB: 'T_B (Side B)',
        valueB: tB,
        axleLoadN: axleForceN,
        isEqual: isEqualTension,
      },
    },
    comparisonRows: [
      {
        metric: 'Cord Tension Across Pulley',
        leftLabel: 'T_A',
        leftValue: `${tA.toFixed(2)} N`,
        rightLabel: 'T_B',
        rightValue: `${tB.toFixed(2)} N`,
        relation: isEqualTension ? 'T_A = T_B (Ideal)' : `|ΔT| = ${tDiff.toFixed(2)} N`,
      },
      {
        metric: 'System Acceleration',
        leftLabel: 'Actual a',
        leftValue: `${accel.toFixed(2)} m/s²`,
        rightLabel: 'Ideal a_0',
        rightValue: `${(
          params.pulleyPreset === 'atwood'
            ? ((mB - mA) * g) / (mA + mB)
            : (mB * g) / (mA + mB)
        ).toFixed(2)} m/s²`,
        relation: params.isIdealPulley ? 'Matches ideal' : 'Reduced by I + τ_f',
      },
      {
        metric: 'Pulley Axle Support Force',
        leftLabel: '|F_axle|',
        leftValue: `${axleForceN.toFixed(2)} N`,
        rightLabel: 'Pulley Model',
        rightValue: params.isIdealPulley ? 'Ideal (2.3.A.3.iv)' : `m_p=${mPulley.toFixed(1)} kg`,
        relation: 'Bracket ↔ Pulley pair',
      },
    ],
    equations: params.isIdealPulley
      ? [
          params.pulleyPreset === 'atwood'
            ? `a = (m_B - m_A)g / (m_A + m_B) = ${accel.toFixed(2)} m/s²`
            : `a = m_B g / (m_A + m_B) = ${accel.toFixed(2)} m/s²`,
          `Ideal Pulley (m_p = 0, τ_f = 0)  →  (T_B - T_A)R = Iα = 0  →  T_A = T_B = ${tA.toFixed(2)} N`,
          `Axle Force Pair: |F_bracket on pulley| = |F_pulley on bracket| = ${axleForceN.toFixed(2)} N`,
        ]
      : [
          `a = (F_drive - τ_f/R) / (m_A + m_B + ½ m_p) = ${accel.toFixed(2)} m/s²`,
          `T_A = ${tA.toFixed(2)} N,   T_B = ${tB.toFixed(2)} N   →   |T_B - T_A| = ${tDiff.toFixed(2)} N`,
          `Torque Check: (T_B - T_A)R - τ_f = (½ m_p R²)(a/R) = ${(0.5 * mPulley * R * accel).toFixed(2)} N·m`,
        ],
    justificationSteps: [
      {
        step: '1. AP Ideal Pulley Definition (EK 2.3.A.3.iv)',
        detail: `An ideal pulley has negligible mass (I ≈ 0) and rotates about a frictionless axle through its center of mass (τ_f = 0), so zero net torque is needed to turn it.`,
      },
      {
        step: '2. Why Ideal Pulley Implies T_A = T_B',
        detail: params.isIdealPulley
          ? `Because (T_B - T_A)R = Iα + τ_f = 0, the tension on both sides of the cord is strictly identical (${tA.toFixed(2)} N). The pulley only changes the direction of tension.`
          : `With nonnegligible pulley mass (${mPulley.toFixed(1)} kg) and friction (${tauF.toFixed(1)} N·m), the heavier side must pull harder (T_B = ${tB.toFixed(1)} N > T_A = ${tA.toFixed(1)} N) to supply net rotational torque.`,
      },
    ],
  };
}
