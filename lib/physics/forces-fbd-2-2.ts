// Pure AP Physics C: Mechanics — Topic 2.2: Forces and Free-Body Diagrams
// Strictly aligned with AP Physics C CED:
//   LO 2.2.A (2.2.A.1, 2.2.A.1.i, 2.2.A.1.ii, 2.2.A.2)
//   LO 2.2.B (2.2.B.1, 2.2.B.2, 2.2.B.3, 2.2.B.4 + AP Boundary Statement)
//   Suggested Skills: 1.A, 2.C, 3.B, 3.C

export type Forces22Mode =
  | 'incline_axes'
  | 'collinear_sidebyside'
  | 'interaction_system'
  | 'fbd_builder';

export type AxisAlignment = 'aligned' | 'standard' | 'custom';

export type CollinearPreset =
  | 'downward_push'
  | 'twin_pull_right'
  | 'double_cable_hoist';

export type SystemSelection = 'block_a' | 'block_b' | 'whole_ab';

export type BuilderScenarioId =
  | 'rough_incline_slide'
  | 'elevator_accel_up'
  | 'wall_pin_push'
  | 'angled_crate_pull';

export type ForceInteractionKind = 'contact' | 'field';

export interface ForceVector22 {
  id: string;
  symbol: string;
  name: string;
  agent: string;
  target: string;
  kind: ForceInteractionKind;
  mechanismNote: string;
  magnitudeN: number;
  /** Direction in world XY plane (degrees, 0 = +x right, 90 = +y up, -90 = -y down) */
  angleDeg: number;
  fxWorldN: number;
  fyWorldN: number;
  /** Components projected onto active coordinate axes (x', y') */
  fxPrimeN: number;
  fyPrimeN: number;
  colorHex: string;
  /** Side-by-side perpendicular offset index (0 = centered, -0.5/+0.5 = parallel pair per AP Boundary Statement) */
  collinearSlotOffset: number;
  collinearGroupSize: number;
}

export interface Forces22Params {
  mode: Forces22Mode;
  // Mode 1: Inclined Plane & Coordinate Axes (2.2.B.4)
  inclineAngleDeg: number; // 5..55
  massKg: number; // 1..12
  muFriction: number; // 0..0.7
  tensionUpN: number; // 0..80
  axisAlignment: AxisAlignment;
  customAxisAngleDeg: number; // -45..55
  // Mode 2: Parallel & Stacked Forces (Boundary Statement side-by-side)
  collinearPreset: CollinearPreset;
  force1N: number; // 10..60
  force2N: number; // 10..60
  // Mode 3: Interactions & System Boundary (2.2.A.1.i-ii, 2.2.A.2)
  massAKg: number; // 1..8
  massBKg: number; // 1..8
  appliedPushN: number; // 10..80
  systemSelection: SystemSelection;
  showMicroContact: boolean;
  // Mode 4: AP FBD Builder & Audit
  builderScenario: BuilderScenarioId;
  // Motion / Visual flags
  simTimeS: number; // 0..2.2
  showFbdDotOnly: boolean;
  showScratchpadComponents: boolean;
}

export interface SvgArrowItem {
  id: string;
  symbol: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  colorHex: string;
  magnitudeN: number;
  isSideBySide: boolean;
}

export interface SvgAxisLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX: number;
  labelY: number;
  colorHex: string;
}

export interface FbdDiagramLayout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  arrows: SvgArrowItem[];
  axes: SvgAxisLine[];
  accelArrow: {
    visible: boolean;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
  };
  scaleNote: string;
}

export interface ComparisonRow22 {
  label: string;
  scenarioA: string;
  scenarioB: string;
  deltaNote: string;
}

export interface JustificationCard22 {
  claim: string;
  evidenceRows: { label: string; value: string }[];
  equationX: string;
  equationY: string;
  principle: string;
  ekRef: string;
}

export interface Forces22ClaimQuestion {
  id: string;
  skill: string;
  ekRef: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

export interface BuilderCandidateVector {
  id: string;
  symbol: string;
  label: string;
  angleDeg: number;
  lengthWeight: number;
  colorHex: string;
  isRequired: boolean;
  violationReason?: string;
  ekRef: string;
}

export interface BuilderScenarioSpec {
  id: BuilderScenarioId;
  title: string;
  shortTitle: string;
  description: string;
  inclineDeg: number;
  surfaceType: 'incline' | 'elevator' | 'wall' | 'floor';
  candidates: BuilderCandidateVector[];
  idealJustification: string;
}

export interface BuilderAuditResult {
  passed: boolean;
  score: number;
  maxScore: number;
  correctCount: number;
  missingSymbols: string[];
  illegalSelections: { symbol: string; reason: string; ekRef: string }[];
  summary: string;
}

export interface Forces22Record {
  id: string;
  label: string;
  forceCount: number;
  netForceN: number;
  accelMps2: number;
  axisAngleDeg: number;
  detail: string;
}

export interface Forces22Evaluation {
  forces: ForceVector22[];
  totalMassKg: number;
  netFxWorldN: number;
  netFyWorldN: number;
  netForceMagN: number;
  netForceAngleDeg: number;
  accelWorldX: number;
  accelWorldY: number;
  accelMagMps2: number;
  accelAngleDeg: number;
  axisAngleDeg: number;
  netFxPrimeN: number;
  netFyPrimeN: number;
  /** Number of forces requiring trig decomposition in active axes vs standard axes */
  decomposedCountActive: number;
  decomposedCountStandard: number;
  /** Internal contact force magnitude between A and B (mode 3) */
  internalContactForceN: number;
  /** Slide displacement along motion direction at simTimeS (capped for viewport) */
  motionDisplacementM: number;
  hasCollinearParallelPair: boolean;
  hudTopTitle: string;
  hudTopValue: string;
  headlineSummary: string;
  ekTakeaway: string;
  diagramLayout: FbdDiagramLayout;
  comparisonTitle: string;
  comparisonRows: ComparisonRow22[];
  justification: JustificationCard22;
}

export const G_ACCEL = 9.8;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function createDefaultForces22Params(mode: Forces22Mode = 'incline_axes'): Forces22Params {
  return {
    mode,
    inclineAngleDeg: 30,
    massKg: 4.0,
    muFriction: 0.2,
    tensionUpN: 0,
    axisAlignment: 'aligned',
    customAxisAngleDeg: 0,
    collinearPreset: 'downward_push',
    force1N: 24,
    force2N: 18,
    massAKg: 4.0,
    massBKg: 2.0,
    appliedPushN: 36,
    systemSelection: 'whole_ab',
    showMicroContact: false,
    builderScenario: 'rough_incline_slide',
    simTimeS: 0,
    showFbdDotOnly: false,
    showScratchpadComponents: false,
  };
}

/** Normalize angle into (-180, 180] */
export function normalizeAngleDeg(deg: number): number {
  let a = ((deg + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(a + 180) < 1e-6) a = 180;
  return a;
}

/** Assign side-by-side slot offsets for forces pointing in the same direction (within 4 deg) per AP Boundary Statement */
export function assignCollinearSlots(rawForces: Omit<ForceVector22, 'collinearSlotOffset' | 'collinearGroupSize'>[]): ForceVector22[] {
  const groups: number[][] = [];
  const used = new Array(rawForces.length).fill(false);

  for (let i = 0; i < rawForces.length; i++) {
    if (used[i]) continue;
    const grp = [i];
    used[i] = true;
    const a1 = normalizeAngleDeg(rawForces[i].angleDeg);
    for (let j = i + 1; j < rawForces.length; j++) {
      if (used[j]) continue;
      const a2 = normalizeAngleDeg(rawForces[j].angleDeg);
      let diff = Math.abs(a1 - a2);
      if (diff > 180) diff = 360 - diff;
      if (diff <= 4.0) {
        grp.push(j);
        used[j] = true;
      }
    }
    groups.push(grp);
  }

  const out: ForceVector22[] = rawForces.map(f => ({
    ...f,
    collinearSlotOffset: 0,
    collinearGroupSize: 1,
  }));

  for (const grp of groups) {
    const n = grp.length;
    if (n <= 1) continue;
    grp.forEach((idx, pos) => {
      out[idx].collinearSlotOffset = pos - (n - 1) / 2;
      out[idx].collinearGroupSize = n;
    });
  }

  return out;
}

function makeForce(
  id: string,
  symbol: string,
  name: string,
  agent: string,
  target: string,
  kind: ForceInteractionKind,
  mechanismNote: string,
  magnitudeN: number,
  angleDeg: number,
  axisAngleDeg: number,
  colorHex: string
): Omit<ForceVector22, 'collinearSlotOffset' | 'collinearGroupSize'> {
  const rad = angleDeg * DEG2RAD;
  const fxWorldN = magnitudeN * Math.cos(rad);
  const fyWorldN = magnitudeN * Math.sin(rad);
  const relRad = (angleDeg - axisAngleDeg) * DEG2RAD;
  const fxPrimeN = magnitudeN * Math.cos(relRad);
  const fyPrimeN = magnitudeN * Math.sin(relRad);
  return {
    id,
    symbol,
    name,
    agent,
    target,
    kind,
    mechanismNote,
    magnitudeN,
    angleDeg: normalizeAngleDeg(angleDeg),
    fxWorldN,
    fyWorldN,
    fxPrimeN,
    fyPrimeN,
    colorHex,
  };
}

function countTrigDecompositions(forces: ForceVector22[], axisAngleDeg: number): number {
  let count = 0;
  for (const f of forces) {
    if (f.magnitudeN < 0.05) continue;
    const rel = Math.abs(normalizeAngleDeg(f.angleDeg - axisAngleDeg)) % 90;
    const distToAxis = Math.min(rel, 90 - rel);
    if (distToAxis > 1.5) count++;
  }
  return count;
}

/** Build bounded 1.A AP Free-Body Diagram SVG geometry (pure forces from dot, side-by-side collinear spacing) */
export function buildFbdDiagramLayout(
  forces: ForceVector22[],
  axisAngleDeg: number,
  accelMagMps2: number,
  accelAngleDeg: number
): FbdDiagramLayout {
  const width = 310;
  const height = 200;
  const cx = 155;
  const cy = 100;
  const maxArrowPx = 68;
  const minArrowPx = 24;

  const maxForceN = Math.max(10, ...forces.map(f => f.magnitudeN));

  // Rotated coordinate axes lines
  const axisRad = axisAngleDeg * DEG2RAD;
  const axisLen = 84;
  const ux = Math.cos(axisRad);
  const uy = -Math.sin(axisRad); // SVG Y increases downward
  const vx = -Math.sin(axisRad);
  const vy = -Math.cos(axisRad);

  const clampX = (x: number) => Math.max(18, Math.min(width - 18, x));
  const clampY = (y: number) => Math.max(14, Math.min(height - 14, y));

  const axes: SvgAxisLine[] = [
    {
      x1: clampX(cx - ux * axisLen),
      y1: clampY(cy - uy * axisLen),
      x2: clampX(cx + ux * axisLen),
      y2: clampY(cy + uy * axisLen),
      label: Math.abs(axisAngleDeg) > 0.5 ? "+x'" : '+x',
      labelX: clampX(cx + ux * (axisLen + 8)),
      labelY: clampY(cy + uy * (axisLen + 8)),
      colorHex: '#34d399',
    },
    {
      x1: clampX(cx - vx * (axisLen * 0.78)),
      y1: clampY(cy - vy * (axisLen * 0.78)),
      x2: clampX(cx + vx * (axisLen * 0.78)),
      y2: clampY(cy + vy * (axisLen * 0.78)),
      label: Math.abs(axisAngleDeg) > 0.5 ? "+y'" : '+y',
      labelX: clampX(cx + vx * (axisLen * 0.78 + 7) - ux * 15),
      labelY: clampY(cy + vy * (axisLen * 0.78 + 7) - uy * 15),
      colorHex: '#38bdf8',
    },
  ];

  const arrows: SvgArrowItem[] = forces.map(f => {
    const rad = f.angleDeg * DEG2RAD;
    const dx = Math.cos(rad);
    const dy = -Math.sin(rad); // SVG Y down
    // Perpendicular unit vector for AP side-by-side collinear spacing
    const px = -dy;
    const py = dx;
    const sideShiftPx = f.collinearSlotOffset * 11;
    const lenPx =
      minArrowPx + (Math.min(1, f.magnitudeN / maxForceN) * (maxArrowPx - minArrowPx));

    const x1 = cx + px * sideShiftPx;
    const y1 = cy + py * sideShiftPx;
    const x2 = clampX(x1 + dx * lenPx);
    const y2 = clampY(y1 + dy * lenPx);

    const extraLabelSide = f.collinearGroupSize > 1 ? f.collinearSlotOffset * 16 : 0;
    const labelX = clampX(x2 + dx * 13 + px * extraLabelSide);
    const labelY = clampY(y2 + dy * 13 + py * extraLabelSide);

    return {
      id: f.id,
      symbol: f.symbol,
      x1,
      y1,
      x2,
      y2,
      labelX,
      labelY,
      colorHex: f.colorHex,
      magnitudeN: f.magnitudeN,
      isSideBySide: f.collinearGroupSize > 1,
    };
  });

  // Acceleration indicator sits OFF the dot in the upper-right corner (never drawn on the FBD dot!)
  const aRad = accelAngleDeg * DEG2RAD;
  const aVisible = accelMagMps2 > 0.08;
  const aCx = 264;
  const aCy = 28;
  const aLen = 22;

  return {
    width,
    height,
    cx,
    cy,
    arrows,
    axes,
    accelArrow: {
      visible: aVisible,
      x1: aCx - Math.cos(aRad) * (aLen * 0.45),
      y1: aCy + Math.sin(aRad) * (aLen * 0.45),
      x2: aCx + Math.cos(aRad) * (aLen * 0.55),
      y2: aCy - Math.sin(aRad) * (aLen * 0.55),
      label: `a = ${accelMagMps2.toFixed(1)} m/s²`,
    },
    scaleNote: `AP FBD Scale · Max arrow = ${maxForceN.toFixed(1)} N`,
  };
}

export const BUILDER_SCENARIOS: BuilderScenarioSpec[] = [
  {
    id: 'rough_incline_slide',
    title: 'Block Sliding Down a Rough Incline',
    shortTitle: 'Rough Incline',
    description:
      'A wooden block slides downward along a rough stationary 30° ramp with no string attached. Select ONLY the true physical forces exerted on the block by its environment.',
    inclineDeg: 30,
    surfaceType: 'incline',
    candidates: [
      {
        id: 'fg',
        symbol: 'F_g',
        label: 'Gravity (Earth on Block, straight down)',
        angleDeg: -90,
        lengthWeight: 1.0,
        colorHex: '#f59e0b',
        isRequired: true,
        ekRef: '2.2.A.1.i',
      },
      {
        id: 'fn',
        symbol: 'F_N',
        label: 'Normal Force (Ramp on Block, ⊥ to ramp)',
        angleDeg: 60,
        lengthWeight: 0.88,
        colorHex: '#38bdf8',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'fk',
        symbol: 'f_k',
        label: 'Kinetic Friction (Ramp on Block, up-ramp)',
        angleDeg: 150,
        lengthWeight: 0.48,
        colorHex: '#fb7185',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'trap_mgsin',
        symbol: 'mg sinθ',
        label: 'Parallel Gravity Component (mg sinθ down-ramp)',
        angleDeg: -30,
        lengthWeight: 0.62,
        colorHex: '#a78bfa',
        isRequired: false,
        violationReason:
          'AP Boundary Statement: Never draw force components (mg sinθ) on a Free-Body Diagram — draw only the full force F_g.',
        ekRef: '2.2.B Boundary',
      },
      {
        id: 'trap_vel',
        symbol: 'v',
        label: 'Velocity Vector (direction of sliding)',
        angleDeg: -30,
        lengthWeight: 0.72,
        colorHex: '#94a3b8',
        isRequired: false,
        violationReason:
          'EK 2.2.B.2: Free-body diagrams show ONLY forces exerted by the environment, never velocity or motion arrows.',
        ekRef: '2.2.B.2',
      },
      {
        id: 'trap_fnet',
        symbol: 'F_net',
        label: 'Net Force Arrow (ma down-ramp)',
        angleDeg: -30,
        lengthWeight: 0.55,
        colorHex: '#f97316',
        isRequired: false,
        violationReason:
          'EK 2.2.B.1–2: F_net is the vector sum of individual forces, NOT a separate external interaction force on the FBD.',
        ekRef: '2.2.B.2',
      },
    ],
    idealJustification:
      'Only Earth (gravity F_g straight down) and the touching ramp (contact forces F_N perpendicular and f_k opposing motion) interact with the block. Components (mg sinθ), velocity, and F_net are excluded by EK 2.2.B.2 and the AP Boundary Statement.',
  },
  {
    id: 'elevator_accel_up',
    title: 'Crate Accelerating Upward on Two Hoist Cables',
    shortTitle: 'Twin Cables',
    description:
      'A lab crate is lifted straight upward with upward acceleration by two identical parallel vertical cables (left and right). Construct the AP-compliant FBD.',
    inclineDeg: 0,
    surfaceType: 'elevator',
    candidates: [
      {
        id: 'ft1',
        symbol: 'F_T1',
        label: 'Cable 1 Tension (straight up, side-by-side)',
        angleDeg: 90,
        lengthWeight: 0.72,
        colorHex: '#34d399',
        isRequired: true,
        ekRef: '2.2.B Boundary',
      },
      {
        id: 'ft2',
        symbol: 'F_T2',
        label: 'Cable 2 Tension (straight up, side-by-side)',
        angleDeg: 90,
        lengthWeight: 0.72,
        colorHex: '#2dd4bf',
        isRequired: true,
        ekRef: '2.2.B Boundary',
      },
      {
        id: 'fg',
        symbol: 'F_g',
        label: 'Gravity (Earth on Crate, straight down)',
        angleDeg: -90,
        lengthWeight: 0.92,
        colorHex: '#f59e0b',
        isRequired: true,
        ekRef: '2.2.A.1.i',
      },
      {
        id: 'trap_ma',
        symbol: 'm·a',
        label: 'Upward Acceleration Force (m·a)',
        angleDeg: 90,
        lengthWeight: 0.55,
        colorHex: '#f97316',
        isRequired: false,
        violationReason:
          'EK 2.2.A.1.i & 2.2.B.2: m·a is the result of net force, not an external agent exerting a force on the crate.',
        ekRef: '2.2.A.1.i',
      },
      {
        id: 'trap_self',
        symbol: 'F_self',
        label: 'Crate Internal Upward Lifting Force',
        angleDeg: 90,
        lengthWeight: 0.5,
        colorHex: '#a78bfa',
        isRequired: false,
        violationReason:
          'EK 2.2.A.1.ii: An object or system cannot exert a net force on itself.',
        ekRef: '2.2.A.1.ii',
      },
    ],
    idealJustification:
      'Both cables exert individual upward contact tensions F_T1 and F_T2 drawn side-by-side (not overlapping!) per the AP Boundary Statement, while Earth exerts downward F_g. Upward acceleration arises because F_T1 + F_T2 > F_g.',
  },
  {
    id: 'wall_pin_push',
    title: 'Book Pinned Against a Rough Vertical Wall',
    shortTitle: 'Wall Push',
    description:
      'A horizontal hand push holds a physics textbook stationary against a rough vertical wall on the right. Identify every external force acting on the textbook.',
    inclineDeg: 0,
    surfaceType: 'wall',
    candidates: [
      {
        id: 'fpush',
        symbol: 'F_hand',
        label: 'Applied Push (Hand on Book, +x into wall)',
        angleDeg: 0,
        lengthWeight: 0.9,
        colorHex: '#34d399',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'fn_wall',
        symbol: 'F_N',
        label: 'Normal Force (Wall on Book, −x away from wall)',
        angleDeg: 180,
        lengthWeight: 0.9,
        colorHex: '#38bdf8',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'fs_up',
        symbol: 'f_s',
        label: 'Static Friction (Wall on Book, +y straight up)',
        angleDeg: 90,
        lengthWeight: 0.72,
        colorHex: '#fb7185',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'fg',
        symbol: 'F_g',
        label: 'Gravity (Earth on Book, −y straight down)',
        angleDeg: -90,
        lengthWeight: 0.72,
        colorHex: '#f59e0b',
        isRequired: true,
        ekRef: '2.2.A.1.i',
      },
      {
        id: 'trap_floor',
        symbol: 'F_floor',
        label: 'Upward Floor Normal Force (no floor contact)',
        angleDeg: 90,
        lengthWeight: 0.65,
        colorHex: '#a78bfa',
        isRequired: false,
        violationReason:
          'EK 2.2.A.2: Contact forces only exist where objects physically touch. The book does not touch the floor; upward static friction from the wall balances gravity.',
        ekRef: '2.2.A.2',
      },
    ],
    idealJustification:
      'Touching agents are the Hand (+x push) and the Vertical Wall (−x normal force F_N and +y static friction f_s), plus non-contact Earth gravity (−y F_g). Note that Normal Force is horizontal here because it is always perpendicular to the contact surface.',
  },
  {
    id: 'angled_crate_pull',
    title: 'Crate Pulled by an Angled Rope on a Rough Floor',
    shortTitle: 'Angled Pull',
    description:
      'A rope angled 35° above the horizontal pulls a crate to the right across a rough laboratory floor. Choose ONLY the true AP FBD forces.',
    inclineDeg: 0,
    surfaceType: 'floor',
    candidates: [
      {
        id: 'ft_ang',
        symbol: 'F_T',
        label: 'Rope Tension (35° above +x)',
        angleDeg: 35,
        lengthWeight: 0.92,
        colorHex: '#34d399',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'fn',
        symbol: 'F_N',
        label: 'Normal Force (Floor on Crate, +y straight up)',
        angleDeg: 90,
        lengthWeight: 0.64,
        colorHex: '#38bdf8',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'fg',
        symbol: 'F_g',
        label: 'Gravity (Earth on Crate, −y straight down)',
        angleDeg: -90,
        lengthWeight: 1.0,
        colorHex: '#f59e0b',
        isRequired: true,
        ekRef: '2.2.A.1.i',
      },
      {
        id: 'fk',
        symbol: 'f_k',
        label: 'Kinetic Friction (Floor on Crate, −x left)',
        angleDeg: 180,
        lengthWeight: 0.54,
        colorHex: '#fb7185',
        isRequired: true,
        ekRef: '2.2.A.2',
      },
      {
        id: 'trap_tx',
        symbol: 'F_T cos35°',
        label: 'Horizontal Tension Component (F_T cos35°)',
        angleDeg: 0,
        lengthWeight: 0.76,
        colorHex: '#a78bfa',
        isRequired: false,
        violationReason:
          'AP Boundary Statement: Never depict force components (F_T cos35° or F_T sin35°) on a Free-Body Diagram — draw only the angled tension arrow F_T.',
        ekRef: '2.2.B Boundary',
      },
    ],
    idealJustification:
      'The AP FBD depicts only the 4 real interaction vectors: angled F_T (rope), upward F_N (floor), leftward f_k (floor), and downward F_g (Earth). Because F_T pulls slightly upward, F_N < F_g, and F_T components belong only in the algebraic equations.',
  },
];

export function getBuilderScenario(id: BuilderScenarioId): BuilderScenarioSpec {
  return BUILDER_SCENARIOS.find(s => s.id === id) || BUILDER_SCENARIOS[0];
}

export function auditBuilderFbd(
  scenarioId: BuilderScenarioId,
  selectedIds: string[]
): BuilderAuditResult {
  const spec = getBuilderScenario(scenarioId);
  const selectedSet = new Set(selectedIds);
  const required = spec.candidates.filter(c => c.isRequired);
  const missingSymbols = required
    .filter(c => !selectedSet.has(c.id))
    .map(c => c.symbol);
  const illegalSelections = spec.candidates
    .filter(c => !c.isRequired && selectedSet.has(c.id))
    .map(c => ({
      symbol: c.symbol,
      reason: c.violationReason || 'Not an external physical force acting on this object.',
      ekRef: c.ekRef,
    }));

  const correctCount = required.length - missingSymbols.length;
  const maxScore = required.length;
  const score = Math.max(0, correctCount - illegalSelections.length);
  const passed = missingSymbols.length === 0 && illegalSelections.length === 0;

  let summary = '';
  if (passed) {
    summary = `AP FBD Verified (${correctCount}/${maxScore}): Every external interaction is drawn as a straight vector from the COM dot with zero component or non-force violations.`;
  } else if (illegalSelections.length > 0 && missingSymbols.length > 0) {
    summary = `Audit Flagged: Remove ${illegalSelections.map(i => i.symbol).join(', ')} and add missing ${missingSymbols.join(', ')}.`;
  } else if (illegalSelections.length > 0) {
    summary = `Boundary Violation: Remove non-force or component vector(s): ${illegalSelections.map(i => i.symbol).join(', ')}.`;
  } else {
    summary = `Incomplete FBD: Add missing external force(s): ${missingSymbols.join(', ')}.`;
  }

  return {
    passed,
    score,
    maxScore,
    correctCount,
    missingSymbols,
    illegalSelections,
    summary,
  };
}

export function evaluateForces22(
  params: Forces22Params,
  builderSelectedIds: string[] = []
): Forces22Evaluation {
  // =========================================================================
  // MODE 1: INCLINED PLANE & ROTATED COORDINATE AXES (EK 2.2.B.1–2.2.B.4)
  // =========================================================================
  if (params.mode === 'incline_axes') {
    const thetaDeg = params.inclineAngleDeg;
    const thetaRad = thetaDeg * DEG2RAD;
    const m = params.massKg;
    const fg = m * G_ACCEL;
    const fn = fg * Math.cos(thetaRad);
    const fMax = params.muFriction * fn;
    const fgDownSlope = fg * Math.sin(thetaRad);
    const ft = params.tensionUpN;

    // Net driving force along down-slope direction (-thetaDeg)
    const driveDown = fgDownSlope - ft;
    let fFrictionMag = 0;
    let fFrictionAngle = 180 - thetaDeg; // up-slope default
    let netDownSlope = 0;
    let isStaticHeld = false;

    if (Math.abs(driveDown) <= fMax + 1e-6) {
      isStaticHeld = true;
      fFrictionMag = Math.abs(driveDown);
      fFrictionAngle = driveDown >= 0 ? 180 - thetaDeg : -thetaDeg;
      netDownSlope = 0;
    } else if (driveDown > 0) {
      fFrictionMag = fMax;
      fFrictionAngle = 180 - thetaDeg; // opposes downward slide
      netDownSlope = driveDown - fFrictionMag;
    } else {
      fFrictionMag = fMax;
      fFrictionAngle = -thetaDeg; // opposes upward pull
      netDownSlope = driveDown + fFrictionMag; // negative => accelerating up-slope
    }

    const axisAngleDeg =
      params.axisAlignment === 'aligned'
        ? -thetaDeg
        : params.axisAlignment === 'standard'
        ? 0
        : params.customAxisAngleDeg;

    const rawForces: Omit<ForceVector22, 'collinearSlotOffset' | 'collinearGroupSize'>[] = [
      makeForce(
        'fg',
        'F_g',
        'Gravitational Force',
        'Earth',
        'Block',
        'field',
        'Non-contact gravitational field interaction (m·g straight down)',
        fg,
        -90,
        axisAngleDeg,
        '#f59e0b'
      ),
      makeForce(
        'fn',
        'F_N',
        'Normal Force',
        'Incline Surface',
        'Block',
        'contact',
        'Interatomic electric repulsion ⊥ to touching ramp surface (2.2.A.2)',
        fn,
        90 - thetaDeg,
        axisAngleDeg,
        '#38bdf8'
      ),
    ];

    if (fFrictionMag > 0.08) {
      rawForces.push(
        makeForce(
          'fric',
          isStaticHeld ? 'f_s' : 'f_k',
          isStaticHeld ? 'Static Friction' : 'Kinetic Friction',
          'Incline Surface',
          'Block',
          'contact',
          'Interatomic surface shear interaction parallel to ramp (2.2.A.2)',
          fFrictionMag,
          fFrictionAngle,
          axisAngleDeg,
          '#fb7185'
        )
      );
    }

    if (ft > 0.2) {
      rawForces.push(
        makeForce(
          'ft',
          'F_T',
          'Rope Tension',
          'Tow Cable',
          'Block',
          'contact',
          'Interatomic molecular tension pulling parallel up the ramp',
          ft,
          180 - thetaDeg,
          axisAngleDeg,
          '#34d399'
        )
      );
    }

    const forces = assignCollinearSlots(rawForces);
    const netFxWorldN = forces.reduce((s, f) => s + f.fxWorldN, 0);
    const netFyWorldN = forces.reduce((s, f) => s + f.fyWorldN, 0);
    const netForceMagN = Math.hypot(netFxWorldN, netFyWorldN);
    const netForceAngleDeg =
      netForceMagN > 0.05 ? normalizeAngleDeg(Math.atan2(netFyWorldN, netFxWorldN) * RAD2DEG) : -thetaDeg;
    const accelWorldX = netFxWorldN / m;
    const accelWorldY = netFyWorldN / m;
    const accelMagMps2 = netForceMagN / m;
    const accelAngleDeg = netForceAngleDeg;
    const netFxPrimeN = forces.reduce((s, f) => s + f.fxPrimeN, 0);
    const netFyPrimeN = forces.reduce((s, f) => s + f.fyPrimeN, 0);

    const decomposedCountActive = countTrigDecompositions(forces, axisAngleDeg);
    const decomposedCountStandard = countTrigDecompositions(forces, 0);

    const aAlongSlope = netDownSlope / m;
    const slideDist = Math.max(-1.1, Math.min(1.1, 0.5 * aAlongSlope * params.simTimeS * params.simTimeS * 0.45));

    const diagramLayout = buildFbdDiagramLayout(forces, axisAngleDeg, accelMagMps2, accelAngleDeg);
    const hasCollinearParallelPair = forces.some(f => f.collinearGroupSize > 1);

    const eqX =
      params.axisAlignment === 'aligned'
        ? `ΣF_x' = mg sin(${thetaDeg}°) ${ft > 0.2 ? '− F_T ' : ''}${
            fFrictionMag > 0.08 ? (fFrictionAngle > 0 ? '− f ' : '+ f ') : ''
          }= ${netFxPrimeN.toFixed(1)} N = m·a_x'`
        : `ΣF_x = F_N sin(${thetaDeg}°) ${
            fFrictionMag > 0.08 ? '− f cos(' + thetaDeg + '°) ' : ''
          }${ft > 0.2 ? '− F_T cos(' + thetaDeg + '°) ' : ''}= ${netFxWorldN.toFixed(1)} N = m·a_x`;

    const eqY =
      params.axisAlignment === 'aligned'
        ? `ΣF_y' = F_N − mg cos(${thetaDeg}°) = ${netFyPrimeN.toFixed(2)} N = 0 (no ⊥ acceleration)`
        : `ΣF_y = F_N cos(${thetaDeg}°) + ${
            fFrictionMag > 0.08 ? 'f sin(' + thetaDeg + '°) ' : ''
          }− F_g = ${netFyWorldN.toFixed(1)} N = m·a_y`;

    return {
      forces,
      totalMassKg: m,
      netFxWorldN,
      netFyWorldN,
      netForceMagN,
      netForceAngleDeg,
      accelWorldX,
      accelWorldY,
      accelMagMps2,
      accelAngleDeg,
      axisAngleDeg,
      netFxPrimeN,
      netFyPrimeN,
      decomposedCountActive,
      decomposedCountStandard,
      internalContactForceN: 0,
      motionDisplacementM: slideDist,
      hasCollinearParallelPair,
      hudTopTitle: `INCLINED PLANE FBD · θ = ${thetaDeg}° · AXES = ${
        params.axisAlignment === 'aligned'
          ? 'ALIGNED (∥ a)'
          : params.axisAlignment === 'standard'
          ? 'STANDARD (x, y)'
          : `CUSTOM (${axisAngleDeg.toFixed(0)}°)`
      }`,
      hudTopValue: isStaticHeld
        ? `ΣF = 0.0 N · Static Equilibrium (F_N = ${fn.toFixed(1)} N)`
        : `|ΣF| = ${netForceMagN.toFixed(1)} N · a = ${accelMagMps2.toFixed(2)} m/s²`,
      headlineSummary: `Inclined Plane (θ = ${thetaDeg}°, m = ${m.toFixed(1)} kg): ${
        forces.length
      } pure forces on COM dot · ${decomposedCountActive} force(s) need trig in active axes vs ${decomposedCountStandard} in standard x-y.`,
      ekTakeaway:
        'EK 2.2.B.4 & Boundary Statement: Aligning +x′ parallel to the acceleration puts a_y′ = 0 so only F_g needs decomposition, while the graded AP FBD itself shows ONLY pure force vectors from the COM dot (never components).',
      diagramLayout,
      comparisonTitle: 'Aligned Axes (∥ a) vs. Standard Horizontal/Vertical (2.C)',
      comparisonRows: [
        {
          label: 'Forces Needing Trig',
          scenarioA: `${countTrigDecompositions(forces, -thetaDeg)} (Only F_g)`,
          scenarioB: `${decomposedCountStandard} (F_N${fFrictionMag > 0.08 ? ', f' : ''}${ft > 0.2 ? ', F_T' : ''})`,
          deltaNote: 'Aligned is simpler',
        },
        {
          label: 'Perpendicular Accel',
          scenarioA: 'a_y′ = 0.00 m/s²',
          scenarioB: `a_y = ${accelWorldY.toFixed(2)} m/s²`,
          deltaNote: 'Decouples F_N',
        },
        {
          label: 'Normal vs Weight',
          scenarioA: `F_N = ${fn.toFixed(1)} N`,
          scenarioB: `F_g = ${fg.toFixed(1)} N (Flat)`,
          deltaNote: `${((fn / fg) * 100).toFixed(0)}% of mg`,
        },
      ],
      justification: {
        claim: isStaticHeld
          ? `The block remains at rest on the ${thetaDeg}° incline because static friction balances the parallel pull (ΣF = 0).`
          : `Setting +x′ parallel to the ${thetaDeg}° ramp yields a single 1D acceleration equation with a_y′ = 0 and a = ${accelMagMps2.toFixed(2)} m/s².`,
        evidenceRows: [
          { label: 'Agents Touching Block', value: ft > 0.2 ? 'Ramp (F_N, f) + Cable (F_T)' : 'Ramp (F_N, f)' },
          { label: 'Field Agent', value: `Earth (F_g = ${fg.toFixed(1)} N straight down)` },
          { label: 'Trig Decompositions', value: `${decomposedCountActive} active vs ${decomposedCountStandard} standard` },
        ],
        equationX: eqX,
        equationY: eqY,
        principle:
          'EK 2.2.B.3–4: Represent all environment forces as straight vectors from the center-of-mass dot and choose one coordinate axis parallel to acceleration to simplify algebraic translation.',
        ekRef: '2.2.B.1–4',
      },
    };
  }

  // =========================================================================
  // MODE 2: PARALLEL & STACKED FORCES (AP BOUNDARY STATEMENT SIDE-BY-SIDE)
  // =========================================================================
  if (params.mode === 'collinear_sidebyside') {
    const m = params.massKg;
    const fg = m * G_ACCEL;
    const axisAngleDeg = 0;
    const rawForces: Omit<ForceVector22, 'collinearSlotOffset' | 'collinearGroupSize'>[] = [];
    let scenarioLabel = '';
    let claimText = '';
    let eqX = '';
    let eqY = '';

    if (params.collinearPreset === 'downward_push') {
      const fPush = params.force1N;
      const fn = fg + fPush;
      scenarioLabel = 'Downward Push + Gravity (Side-by-Side −y)';
      rawForces.push(
        makeForce('fn', 'F_N', 'Normal Force', 'Lab Bench', 'Block', 'contact', 'Upward interatomic contact support balancing both downward forces', fn, 90, 0, '#38bdf8'),
        makeForce('fg', 'F_g', 'Gravitational Force', 'Earth', 'Block', 'field', 'Non-contact downward pull from Earth (drawn side-by-side with F_push)', fg, -90, 0, '#f59e0b'),
        makeForce('fpush', 'F_push', 'Applied Downward Push', 'Hand / Piston', 'Block', 'contact', 'Downward contact push (drawn side-by-side with F_g, never overlapping!)', fPush, -90, 0, '#34d399')
      );
      claimText = `Because F_g (${fg.toFixed(1)} N) and F_push (${fPush.toFixed(1)} N) both act straight down, they are drawn side-by-side on the FBD and sum to F_N = ${fn.toFixed(1)} N.`;
      eqX = 'ΣF_x = 0 N (no horizontal agents)';
      eqY = `ΣF_y = F_N − F_g − F_push = ${fn.toFixed(1)} − ${fg.toFixed(1)} − ${fPush.toFixed(1)} = 0.0 N`;
    } else if (params.collinearPreset === 'twin_pull_right') {
      const ft1 = params.force1N;
      const ft2 = params.force2N;
      const fn = fg;
      const fMax = params.muFriction * fn;
      const fPullTotal = ft1 + ft2;
      const fFric = Math.min(fMax, fPullTotal);
      scenarioLabel = 'Twin Parallel Ropes Right (Side-by-Side +x)';
      rawForces.push(
        makeForce('ft1', 'F_T1', 'Upper Rope Tension', 'Rope 1', 'Crate', 'contact', 'Rightward contact tension (drawn side-by-side with F_T2)', ft1, 0, 0, '#34d399'),
        makeForce('ft2', 'F_T2', 'Lower Rope Tension', 'Rope 2', 'Crate', 'contact', 'Rightward contact tension (drawn side-by-side with F_T1)', ft2, 0, 0, '#2dd4bf'),
        makeForce('fn', 'F_N', 'Normal Force', 'Floor', 'Crate', 'contact', 'Upward contact repulsion from floor', fn, 90, 0, '#38bdf8'),
        makeForce('fg', 'F_g', 'Gravitational Force', 'Earth', 'Crate', 'field', 'Downward gravitational pull from Earth', fg, -90, 0, '#f59e0b')
      );
      if (fFric > 0.1) {
        rawForces.push(
          makeForce('fk', fPullTotal <= fMax ? 'f_s' : 'f_k', fPullTotal <= fMax ? 'Static Friction' : 'Kinetic Friction', 'Floor', 'Crate', 'contact', 'Leftward contact shear opposing rightward pull', fFric, 180, 0, '#fb7185')
        );
      }
      claimText = `Two separate ropes pulling in the same +x direction MUST appear as two distinct side-by-side arrows (F_T1 = ${ft1.toFixed(0)} N, F_T2 = ${ft2.toFixed(0)} N), never merged or stacked directly atop each other.`;
      eqX = `ΣF_x = F_T1 + F_T2 − f = ${(fPullTotal - fFric).toFixed(1)} N = m·a_x`;
      eqY = `ΣF_y = F_N − F_g = 0.0 N`;
    } else {
      const ft1 = params.force1N;
      const ft2 = params.force2N;
      scenarioLabel = 'Double-Cable Hoist (Side-by-Side +y)';
      rawForces.push(
        makeForce('ft1', 'F_T1', 'Left Hoist Cable', 'Cable 1', 'Load', 'contact', 'Upward contact tension (side-by-side with Cable 2)', ft1, 90, 0, '#34d399'),
        makeForce('ft2', 'F_T2', 'Right Hoist Cable', 'Cable 2', 'Load', 'contact', 'Upward contact tension (side-by-side with Cable 1)', ft2, 90, 0, '#2dd4bf'),
        makeForce('fg', 'F_g', 'Gravitational Force', 'Earth', 'Load', 'field', 'Downward gravitational attraction from Earth', fg, -90, 0, '#f59e0b')
      );
      const netY = ft1 + ft2 - fg;
      claimText = `Both hoist cables exert upward tension drawn side-by-side on the COM dot (F_T1 + F_T2 = ${(ft1 + ft2).toFixed(0)} N vs F_g = ${fg.toFixed(1)} N), yielding a_y = ${(netY / m).toFixed(2)} m/s².`;
      eqX = 'ΣF_x = 0 N';
      eqY = `ΣF_y = F_T1 + F_T2 − F_g = ${netY.toFixed(1)} N = m·a_y`;
    }

    const forces = assignCollinearSlots(rawForces);
    const netFxWorldN = forces.reduce((s, f) => s + f.fxWorldN, 0);
    const netFyWorldN = forces.reduce((s, f) => s + f.fyWorldN, 0);
    const netForceMagN = Math.hypot(netFxWorldN, netFyWorldN);
    const netForceAngleDeg =
      netForceMagN > 0.05 ? normalizeAngleDeg(Math.atan2(netFyWorldN, netFxWorldN) * RAD2DEG) : 0;
    const accelWorldX = netFxWorldN / m;
    const accelWorldY = netFyWorldN / m;
    const accelMagMps2 = netForceMagN / m;

    const diagramLayout = buildFbdDiagramLayout(forces, axisAngleDeg, accelMagMps2, netForceAngleDeg);
    const parallelPair = forces.filter(f => f.collinearGroupSize > 1);
    const motionDisp = Math.max(-0.9, Math.min(0.9, 0.5 * (accelWorldX || accelWorldY) * params.simTimeS * params.simTimeS * 0.25));

    return {
      forces,
      totalMassKg: m,
      netFxWorldN,
      netFyWorldN,
      netForceMagN,
      netForceAngleDeg,
      accelWorldX,
      accelWorldY,
      accelMagMps2,
      accelAngleDeg: netForceAngleDeg,
      axisAngleDeg,
      netFxPrimeN: netFxWorldN,
      netFyPrimeN: netFyWorldN,
      decomposedCountActive: 0,
      decomposedCountStandard: 0,
      internalContactForceN: 0,
      motionDisplacementM: motionDisp,
      hasCollinearParallelPair: parallelPair.length >= 2,
      hudTopTitle: `SIDE-BY-SIDE AP FBD · ${
        params.collinearPreset === 'downward_push'
          ? 'DOWNWARD PUSH + GRAVITY'
          : params.collinearPreset === 'twin_pull_right'
          ? 'TWIN PARALLEL ROPES (+x)'
          : 'DOUBLE-CABLE VERTICAL HOIST (+y)'
      }`,
      hudTopValue: `Parallel Pair: ${parallelPair.map(p => p.symbol).join(' ∥ ')} · |ΣF| = ${netForceMagN.toFixed(1)} N`,
      headlineSummary: `${scenarioLabel}: ${parallelPair.map(p => `${p.symbol}=${p.magnitudeN.toFixed(0)}N`).join(' & ')} drawn side-by-side without overlapping (AP Boundary Statement).`,
      ekTakeaway:
        'AP Boundary Statement (p. 45): Individual forces in the same direction MUST be drawn as separate straight arrows side-by-side originating on the dot — never overlapping on top of one another.',
      diagramLayout,
      comparisonTitle: 'Parallel Forces Combined vs. Single Force Baseline (2.C)',
      comparisonRows: [
        {
          label: 'Collinear Forces',
          scenarioA: `${parallelPair.length} side-by-side arrows`,
          scenarioB: '1 arrow (without 2nd agent)',
          deltaNote: 'Never overlap arrows',
        },
        {
          label: 'Sum of Parallel Pair',
          scenarioA: `${parallelPair.reduce((s, p) => s + p.magnitudeN, 0).toFixed(1)} N`,
          scenarioB: `${(parallelPair[0]?.magnitudeN ?? 0).toFixed(1)} N`,
          deltaNote: `+${(parallelPair[1]?.magnitudeN ?? 0).toFixed(1)} N extra`,
        },
        {
          label: 'Contact vs Field',
          scenarioA: `${forces.filter(f => f.kind === 'contact').length} Contact (electric)`,
          scenarioB: `${forces.filter(f => f.kind === 'field').length} Field (gravity)`,
          deltaNote: 'EK 2.2.A.2',
        },
      ],
      justification: {
        claim: claimText,
        evidenceRows: [
          { label: 'Side-by-Side Pair', value: parallelPair.map(p => `${p.symbol} (${p.agent})`).join(' + ') },
          { label: 'Arrow Origins', value: 'All arrows start on the COM dot, separated laterally' },
          { label: 'Net Acceleration', value: `a = ${accelMagMps2.toFixed(2)} m/s²` },
        ],
        equationX: eqX,
        equationY: eqY,
        principle:
          'AP Boundary Statement & EK 2.2.A.2: Distinct physical agents touching the object produce separate contact force arrows drawn side-by-side when collinear.',
        ekRef: '2.2.B Boundary',
      },
    };
  }

  // =========================================================================
  // MODE 3: INTERACTIONS & SYSTEM BOUNDARY (EK 2.2.A.1.i–ii & 2.2.A.2)
  // =========================================================================
  if (params.mode === 'interaction_system') {
    const mA = params.massAKg;
    const mB = params.massBKg;
    const mTot = mA + mB;
    const fApp = params.appliedPushN;
    const mu = params.muFriction;

    const fgA = mA * G_ACCEL;
    const fgB = mB * G_ACCEL;
    const fgTot = mTot * G_ACCEL;
    const fMaxTot = mu * fgTot;

    let accelX = 0;
    let fFricA = 0;
    let fFricB = 0;
    let fContactAB = 0; // Force of A on B (rightward) = Force of B on A (leftward)

    if (fApp <= fMaxTot + 1e-6) {
      // Static equilibrium: friction holds blocks; distribute contact force physically
      accelX = 0;
      const fMaxA = mu * fgA;
      if (fApp <= fMaxA) {
        fFricA = fApp;
        fContactAB = 0;
        fFricB = 0;
      } else {
        fFricA = fMaxA;
        fContactAB = fApp - fMaxA;
        fFricB = fContactAB;
      }
    } else {
      fFricA = mu * fgA;
      fFricB = mu * fgB;
      accelX = (fApp - fFricA - fFricB) / mTot;
      fContactAB = mB * accelX + fFricB;
    }

    const rawForces: Omit<ForceVector22, 'collinearSlotOffset' | 'collinearGroupSize'>[] = [];
    let selectedMass = mTot;
    let targetLabel = 'System (A+B)';

    if (params.systemSelection === 'whole_ab') {
      selectedMass = mTot;
      targetLabel = 'System (A+B)';
      rawForces.push(
        makeForce('fapp', 'F_app', 'Applied External Push', 'Hand / Actuator', 'System (A+B)', 'contact', 'External contact push crossing system boundary', fApp, 0, 0, '#34d399'),
        makeForce('fn_ab', 'F_N', 'Combined Normal Force', 'Lab Track', 'System (A+B)', 'contact', 'Upward interatomic track support on combined mass', fgTot, 90, 0, '#38bdf8'),
        makeForce('fg_ab', 'F_g', 'Combined Gravity', 'Earth', 'System (A+B)', 'field', 'Downward gravitational pull on total mass (m_A + m_B)g', fgTot, -90, 0, '#f59e0b')
      );
      if (fFricA + fFricB > 0.1) {
        rawForces.push(
          makeForce('f_ab', accelX > 0.01 ? 'f_k' : 'f_s', 'Combined Friction', 'Lab Track', 'System (A+B)', 'contact', 'External track friction opposing push (F_A↔B is internal & omitted!)', fFricA + fFricB, 180, 0, '#fb7185')
        );
      }
    } else if (params.systemSelection === 'block_a') {
      selectedMass = mA;
      targetLabel = 'Block A Only';
      rawForces.push(
        makeForce('fapp', 'F_app', 'Applied External Push', 'Hand / Actuator', 'Block A', 'contact', 'External rightward push from actuator on Block A', fApp, 0, 0, '#34d399'),
        makeForce('fn_a', 'F_N,A', 'Normal Force on A', 'Lab Track', 'Block A', 'contact', 'Upward interatomic contact support from track on A', fgA, 90, 0, '#38bdf8'),
        makeForce('fg_a', 'F_g,A', 'Gravity on Block A', 'Earth', 'Block A', 'field', 'Downward gravitational force from Earth on A', fgA, -90, 0, '#f59e0b')
      );
      if (fContactAB > 0.1) {
        rawForces.push(
          makeForce('f_ba', 'F_B→A', 'Contact Push from B', 'Block B', 'Block A', 'contact', 'External to Block A! Interatomic repulsion from Block B pushing left', fContactAB, 180, 0, '#a78bfa')
        );
      }
      if (fFricA > 0.1) {
        rawForces.push(
          makeForce('f_a', accelX > 0.01 ? 'f_k,A' : 'f_s,A', 'Track Friction on A', 'Lab Track', 'Block A', 'contact', 'Leftward shear friction from track (side-by-side with F_B→A!)', fFricA, 180, 0, '#fb7185')
        );
      }
    } else {
      selectedMass = mB;
      targetLabel = 'Block B Only';
      if (fContactAB > 0.1) {
        rawForces.push(
          makeForce('f_ab_push', 'F_A→B', 'Contact Push from A', 'Block A', 'Block B', 'contact', 'External to Block B! Interatomic contact force from A pushing B right', fContactAB, 0, 0, '#a78bfa')
        );
      }
      rawForces.push(
        makeForce('fn_b', 'F_N,B', 'Normal Force on B', 'Lab Track', 'Block B', 'contact', 'Upward interatomic track support on B', fgB, 90, 0, '#38bdf8'),
        makeForce('fg_b', 'F_g,B', 'Gravity on Block B', 'Earth', 'Block B', 'field', 'Downward gravitational force from Earth on B', fgB, -90, 0, '#f59e0b')
      );
      if (fFricB > 0.1) {
        rawForces.push(
          makeForce('f_b', accelX > 0.01 ? 'f_k,B' : 'f_s,B', 'Track Friction on B', 'Lab Track', 'Block B', 'contact', 'Leftward track friction on Block B', fFricB, 180, 0, '#fb7185')
        );
      }
    }

    const forces = assignCollinearSlots(rawForces);
    const netFxWorldN = forces.reduce((s, f) => s + f.fxWorldN, 0);
    const netFyWorldN = forces.reduce((s, f) => s + f.fyWorldN, 0);
    const netForceMagN = Math.hypot(netFxWorldN, netFyWorldN);
    const netForceAngleDeg = netForceMagN > 0.05 ? 0 : 0;
    const diagramLayout = buildFbdDiagramLayout(forces, 0, accelX, 0);
    const motionDisp = Math.min(1.05, 0.5 * accelX * params.simTimeS * params.simTimeS * 0.25);

    const eqX =
      params.systemSelection === 'whole_ab'
        ? `ΣF_x(A+B) = F_app − f_total = ${netFxWorldN.toFixed(1)} N = (${mTot.toFixed(1)} kg)·a (F_A↔B cancels!)`
        : params.systemSelection === 'block_a'
        ? `ΣF_x(A) = F_app − F_B→A − f_A = ${netFxWorldN.toFixed(1)} N = (${mA.toFixed(1)} kg)·a`
        : `ΣF_x(B) = F_A→B − f_B = ${netFxWorldN.toFixed(1)} N = (${mB.toFixed(1)} kg)·a`;

    return {
      forces,
      totalMassKg: selectedMass,
      netFxWorldN,
      netFyWorldN,
      netForceMagN,
      netForceAngleDeg,
      accelWorldX: accelX,
      accelWorldY: 0,
      accelMagMps2: accelX,
      accelAngleDeg: 0,
      axisAngleDeg: 0,
      netFxPrimeN: netFxWorldN,
      netFyPrimeN: netFyWorldN,
      decomposedCountActive: 0,
      decomposedCountStandard: 0,
      internalContactForceN: fContactAB,
      motionDisplacementM: motionDisp,
      hasCollinearParallelPair: forces.some(f => f.collinearGroupSize > 1),
      hudTopTitle: `SYSTEM BOUNDARY: ${targetLabel.toUpperCase()} · ${
        params.systemSelection === 'whole_ab'
          ? 'INTERNAL F_A↔B OMITTED (2.2.A.1.ii)'
          : `EXTERNAL CONTACT F_A↔B = ${fContactAB.toFixed(1)} N`
      }`,
      hudTopValue: `M_sys = ${selectedMass.toFixed(1)} kg · ΣF_x = ${netFxWorldN.toFixed(1)} N · a = ${accelX.toFixed(2)} m/s²`,
      headlineSummary: `${targetLabel}: ${
        params.systemSelection === 'whole_ab'
          ? `F_A→B and F_B→A (${fContactAB.toFixed(1)} N) are internal so they cancel and do NOT appear on the System FBD (2.2.A.1.ii).`
          : `F_A↔B (${fContactAB.toFixed(1)} N) crosses the chosen boundary, so it appears as an external contact force on the FBD (2.2.A.1.i).`
      }`,
      ekTakeaway:
        'EK 2.2.A.1.i–ii & 2.2.A.2: A system cannot exert a net force on itself — internal contact forces vanish on the System (A+B) FBD, while macroscopic contact forces arise from interatomic electric repulsion at the touching boundary.',
      diagramLayout,
      comparisonTitle: 'System (A+B) vs. Individual Block A & Block B (2.C)',
      comparisonRows: [
        {
          label: 'F_A↔B on FBD?',
          scenarioA: 'Omitted (Internal to A+B)',
          scenarioB: `Shown: ${fContactAB.toFixed(1)} N (External to A or B)`,
          deltaNote: 'EK 2.2.A.1.ii',
        },
        {
          label: 'Acceleration a_x',
          scenarioA: `${accelX.toFixed(2)} m/s² (System A+B)`,
          scenarioB: `${accelX.toFixed(2)} m/s² (Both A & B)`,
          deltaNote: 'Identical constraint',
        },
        {
          label: 'Net Force ΣF_x',
          scenarioA: `${(mTot * accelX).toFixed(1)} N (on A+B)`,
          scenarioB: `A: ${(mA * accelX).toFixed(1)} N · B: ${(mB * accelX).toFixed(1)} N`,
          deltaNote: 'F_net,A + F_net,B = F_net,sys',
        },
      ],
      justification: {
        claim:
          params.systemSelection === 'whole_ab'
            ? `Treating (A + B) as one system removes F_A↔B (${fContactAB.toFixed(1)} N) from the FBD because a system cannot exert a net force on itself.`
            : `Isolating ${targetLabel} turns the inter-block contact push (${fContactAB.toFixed(1)} N) into an external boundary interaction needed to solve for internal contact force.`,
        evidenceRows: [
          { label: 'Chosen System Mass', value: `${selectedMass.toFixed(1)} kg (${targetLabel})` },
          { label: 'Inter-Block Contact', value: `${fContactAB.toFixed(1)} N (${params.systemSelection === 'whole_ab' ? 'Internal — excluded' : 'External — included'})` },
          { label: 'Contact Origin (2.2.A.2)', value: 'Macroscopic interatomic electric repulsion' },
        ],
        equationX: eqX,
        equationY: `ΣF_y = F_N − F_g = 0.0 N (F_N = ${(selectedMass * G_ACCEL).toFixed(1)} N)`,
        principle:
          'EK 2.2.A.1.i–ii & 2.2.B.2: Every FBD arrow must represent an interaction with an external agent outside the chosen system boundary.',
        ekRef: '2.2.A.1–2',
      },
    };
  }

  // =========================================================================
  // MODE 4: AP FBD BUILDER & AUDIT (1.A, 2.C, 3.B, 3.C + BOUNDARY STATEMENT)
  // =========================================================================
  const spec = getBuilderScenario(params.builderScenario);
  const selectedSet = new Set(builderSelectedIds);
  const chosenCandidates = spec.candidates.filter(c => selectedSet.has(c.id));
  const audit = auditBuilderFbd(params.builderScenario, builderSelectedIds);

  const rawForces: Omit<ForceVector22, 'collinearSlotOffset' | 'collinearGroupSize'>[] =
    chosenCandidates.map(c =>
      makeForce(
        c.id,
        c.symbol,
        c.label,
        c.isRequired ? 'External Environment Agent' : 'INVALID (Non-Force / Component)',
        'Object Dot',
        c.id === 'fg' ? 'field' : 'contact',
        c.isRequired ? `Valid AP FBD vector (${c.ekRef})` : c.violationReason || 'Violation',
        c.lengthWeight * 36,
        c.angleDeg,
        spec.inclineDeg > 0 ? -spec.inclineDeg : 0,
        c.colorHex
      )
    );

  const forces = assignCollinearSlots(rawForces);
  const axisAngleDeg = spec.inclineDeg > 0 ? -spec.inclineDeg : 0;
  const diagramLayout = buildFbdDiagramLayout(forces, axisAngleDeg, 0, axisAngleDeg);

  return {
    forces,
    totalMassKg: 4.0,
    netFxWorldN: 0,
    netFyWorldN: 0,
    netForceMagN: 0,
    netForceAngleDeg: 0,
    accelWorldX: 0,
    accelWorldY: 0,
    accelMagMps2: 0,
    accelAngleDeg: 0,
    axisAngleDeg,
    netFxPrimeN: 0,
    netFyPrimeN: 0,
    decomposedCountActive: countTrigDecompositions(forces, axisAngleDeg),
    decomposedCountStandard: countTrigDecompositions(forces, 0),
    internalContactForceN: 0,
    motionDisplacementM: 0,
    hasCollinearParallelPair: forces.some(f => f.collinearGroupSize > 1),
    hudTopTitle: `AP FBD BUILDER · ${spec.title.toUpperCase()}`,
    hudTopValue: audit.passed
      ? `AP AUDIT PASSED (${audit.correctCount}/${audit.maxScore} Valid Forces)`
      : `Selected: ${chosenCandidates.length} Vector(s) · Target: ${audit.maxScore} True Forces`,
    headlineSummary: audit.summary,
    ekTakeaway:
      'AP Exam FBD Rules (2.2.B): Draw ONLY real external forces as straight arrows starting on the COM dot; NEVER draw components, velocity, F_net, or self-forces; draw collinear forces side-by-side.',
    diagramLayout,
    comparisonTitle: 'Your Constructed FBD vs. AP Exam Rubric (2.C)',
    comparisonRows: [
      {
        label: 'Required Forces Found',
        scenarioA: `${audit.correctCount} of ${audit.maxScore}`,
        scenarioB: `${audit.maxScore} of ${audit.maxScore} required`,
        deltaNote: audit.missingSymbols.length === 0 ? 'All present' : `Missing: ${audit.missingSymbols.join(', ')}`,
      },
      {
        label: 'Illegal Traps Included',
        scenarioA: `${audit.illegalSelections.length} violation(s)`,
        scenarioB: '0 violations allowed',
        deltaNote: audit.illegalSelections.length === 0 ? 'Clean' : audit.illegalSelections.map(i => i.symbol).join(', '),
      },
      {
        label: 'AP Boundary Status',
        scenarioA: audit.passed ? 'Exam-Ready FBD' : 'Needs Revision',
        scenarioB: 'Pure forces from dot',
        deltaNote: 'Boundary Statement',
      },
    ],
    justification: {
      claim: audit.passed
        ? `Your free-body diagram for "${spec.shortTitle}" satisfies every AP Physics C Topic 2.2 rule.`
        : `Inspect each vector on "${spec.shortTitle}": every arrow must have a distinct external physical agent.`,
      evidenceRows: [
        { label: 'Scenario', value: spec.title },
        { label: 'Valid Vectors Selected', value: `${audit.correctCount}/${audit.maxScore}` },
        { label: 'Violations Detected', value: audit.illegalSelections.length === 0 ? 'None' : audit.illegalSelections.map(i => i.symbol).join(', ') },
      ],
      equationX: 'Rule 1: Every arrow = one external interaction (Agent → Object)',
      equationY: 'Rule 2: No components (mg sinθ), no velocity v, no separate F_net',
      principle: spec.idealJustification,
      ekRef: '2.2.A & 2.2.B',
    },
  };
}

export const TOPIC_22_CLAIM_QUESTIONS: Forces22ClaimQuestion[] = [
  {
    id: 'q1_boundary_components',
    skill: '3.B / 3.C',
    ekRef: '2.2.B Boundary Statement',
    prompt:
      'A block slides down a rough 30° incline. On the AP Physics C exam free-body diagram, a student draws F_N, f_k, F_g, AND also draws two additional arrows labeled mg sin(30°) and mg cos(30°) originating from the dot. Why does this lose credit?',
    options: [
      {
        id: 'a',
        text: 'Because mg sin(30°) points up the incline instead of down.',
      },
      {
        id: 'b',
        text: 'Because AP FBDs must depict ONLY the real forces exerted on the object, never force components — drawing both F_g and its components double-counts gravity.',
      },
      {
        id: 'c',
        text: 'Because normal force and friction are not allowed on inclined plane FBDs.',
      },
    ],
    correctId: 'b',
    explanation:
      'Per the Topic 2.2 Boundary Statement, students must depict ONLY the forces exerted on the object, never force components. Components belong strictly in the algebraic ΣF equations.',
  },
  {
    id: 'q2_self_force',
    skill: '3.B',
    ekRef: '2.2.A.1.i–ii',
    prompt:
      'Two touching blocks A and B are pushed across a smooth table by an external hand force F_app on A. When drawing the FBD of the combined two-block system (A + B), why is the contact force F_A→B omitted?',
    options: [
      {
        id: 'a',
        text: 'Because F_A→B and F_B→A are internal interactions within the (A + B) system, and a system cannot exert a net force on itself.',
      },
      {
        id: 'b',
        text: 'Because block A does not push on block B when they accelerate together.',
      },
      {
        id: 'c',
        text: 'Because contact forces are always zero on smooth tables.',
      },
    ],
    correctId: 'a',
    explanation:
      'By EK 2.2.A.1.ii and 2.2.B.2, an FBD shows only forces exerted by the environment outside the system boundary. Internal interactions cancel pairwise inside the (A + B) system.',
  },
  {
    id: 'q3_contact_origin',
    skill: '3.B / 3.C',
    ekRef: '2.2.A.2',
    prompt:
      'At the microscopic level, what fundamental interaction produces macroscopic contact forces such as the normal force F_N, static friction f_s, and rope tension F_T?',
    options: [
      {
        id: 'a',
        text: 'Gravitational attraction between individual atoms on the two surfaces.',
      },
      {
        id: 'b',
        text: 'Interatomic electric forces between atoms at the touching boundary or along molecular bonds.',
      },
      {
        id: 'c',
        text: 'Nuclear strong forces acting across macroscopic millimeter gaps.',
      },
    ],
    correctId: 'b',
    explanation:
      'EK 2.2.A.2 states explicitly that contact forces describe touching interactions and are macroscopic effects of interatomic electric forces.',
  },
  {
    id: 'q4_side_by_side_axes',
    skill: '1.A / 2.C / 3.B',
    ekRef: '2.2.B.4 & Boundary Statement',
    prompt:
      'Two parallel cables pull straight upward on a hanging crate while Earth pulls downward. How must the two tension vectors be drawn on an AP FBD, and how should axes be oriented?',
    options: [
      {
        id: 'a',
        text: 'Draw F_T1 and F_T2 directly on top of each other so only one arrow is visible.',
      },
      {
        id: 'b',
        text: 'Draw F_T1 and F_T2 as two distinct straight arrows originating on the dot side-by-side (not overlapping), with one axis aligned vertically along the acceleration.',
      },
      {
        id: 'c',
        text: 'Connect F_T2 tip-to-tail at the tip of F_T1 so it does not touch the dot.',
      },
    ],
    correctId: 'b',
    explanation:
      'Per EK 2.2.B.3–4 and the Boundary Statement, every force arrow originates on the COM dot, same-direction forces are drawn side-by-side (not overlapping), and aligning one axis with acceleration simplifies algebraic translation.',
  },
];
