// Pure physics & curriculum engine for AP Physics C: Mechanics
// Topic 2.9 — Resistive Forces (CED LO 2.9.A, EK 2.9.A.1–2.9.A.3)
// Zero React/DOM dependencies so it can be deterministically unit-tested via node:test.

export const G_GRAVITY = 9.81; // m/s^2

export type Resistive29Mode =
  | 'vertical_drop'
  | 'horizontal_coast'
  | 'powered_thrust'
  | 'dual_compare';

export type ResistiveChartKind = 'v_vs_t' | 'a_vs_t' | 'x_vs_t' | 'fr_vs_v';

export interface Resistive29Params {
  mode: Resistive29Mode;
  massKg: number;       // 0.2 – 5.0 kg (Lane A or single object)
  dragK: number;        // 0.4 – 8.0 kg/s (linear drag coefficient F_r = -k v)
  v0: number;           // 0 – 25 m/s (initial speed along +motion axis)
  driveForceN: number;  // 2 – 40 N (constant thrust in powered_thrust mode)
  // Secondary lane for dual_compare (Skill 2.C side-by-side race)
  massBKg: number;      // 0.2 – 5.0 kg
  dragBK: number;       // 0.4 – 8.0 kg/s
  v0B: number;          // 0 – 25 m/s
  timeS: number;        // 0 – 12 s
  showForceVectors: boolean;
  showAsymptotes: boolean;
}

export interface LinearDragBodyState {
  massKg: number;
  dragK: number;
  v0: number;
  drivingForceN: number;
  tauS: number;             // characteristic time constant m / k (s)
  vTerminal: number;        // asymptotic terminal velocity F_drive / k (m/s)
  xMaxAsymptote: number | null; // finite stopping distance m*v0/k when F_drive = 0
  positionM: number;        // displacement s(t) along +motion axis (m)
  velocityMs: number;       // v(t) (m/s)
  accelMs2: number;         // a(t) = dv/dt (m/s^2)
  dragForceN: number;       // signed resistive force -k*v (N)
  dragMagN: number;         // |F_r| = k*|v| (N)
  netForceN: number;        // F_drive - k*v (N)
  initialAccelMs2: number;  // a(0) = (F_drive - k*v0) / m (m/s^2)
  terminalProgressPct: number; // 0..100 % approach toward asymptote
  isAtTerminal: boolean;    // |F_net| / max(1, F_drive or k*v0) < 0.02
  regime: 'accelerating_to_vt' | 'decelerating_to_vt' | 'at_terminal' | 'coasting_decay' | 'at_rest';
}

export interface Resistive29Evaluation {
  mode: Resistive29Mode;
  timeS: number;
  primary: LinearDragBodyState;
  secondary: LinearDragBodyState | null; // populated in dual_compare mode
  asymptoteSummary: string;
  keyInsight: string;
  maxRecommendedTimeS: number;
}

export interface ResistiveTrialPoint {
  id: string;
  mode: Resistive29Mode;
  timeS: number;
  velocityMs: number;
  accelMs2: number;
  positionM: number;
  dragMagN: number;
  massKg: number;
  dragK: number;
  label: string;
}

export interface ResistiveChartPoint {
  x: number;
  y: number;
}

export interface ResistiveChartBundle {
  kind: ResistiveChartKind;
  title: string;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  curveA: ResistiveChartPoint[];
  curveB: ResistiveChartPoint[] | null;
  currentA: ResistiveChartPoint;
  currentB: ResistiveChartPoint | null;
  asymptoteLineA: { yStart: number; yEnd: number; label: string } | null;
  asymptoteLineB: { yStart: number; yEnd: number; label: string } | null;
  tauMarkers: Array<{ x: number; label: string }>;
  equationCaption: string;
}

export interface DerivationStep29 {
  stepNumber: number;
  title: string;
  ekCode: string;
  symbolicFormula: string;
  liveSubstitution: string;
  explanation: string;
}

export interface ComparisonRow29 {
  metric: string;
  colA: string;
  colB: string;
  ratioOrNote: string;
}

export interface ComparisonChallenge29 {
  id: string;
  prompt: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
  ekCode: string;
}

export interface LabProcedure29 {
  id: string;
  title: string;
  objective: string;
  equipment: string[];
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
  linearizationFormula: string;
}

export interface ClaimCard29 {
  id: string;
  ekCode: string;
  statement: string;
  isTrue: boolean;
  justification: string;
}

export const DEFAULT_RESISTIVE_29_PARAMS: Resistive29Params = {
  mode: 'vertical_drop',
  massKg: 1.5,
  dragK: 1.5,
  v0: 0,
  driveForceN: 18,
  massBKg: 3.0,
  dragBK: 1.5,
  v0B: 0,
  timeS: 0,
  showForceVectors: true,
  showAsymptotes: true,
};

export const INITIAL_RESISTIVE_TRIALS_29: ResistiveTrialPoint[] = [
  {
    id: 'seed-1',
    mode: 'vertical_drop',
    timeS: 0.5,
    velocityMs: 3.86,
    accelMs2: 5.95,
    positionM: 1.05,
    dragMagN: 5.79,
    massKg: 1.5,
    dragK: 1.5,
    label: 't = 0.50 s',
  },
  {
    id: 'seed-2',
    mode: 'vertical_drop',
    timeS: 1.0,
    velocityMs: 6.2,
    accelMs2: 3.61,
    positionM: 3.61,
    dragMagN: 9.3,
    massKg: 1.5,
    dragK: 1.5,
    label: 't = 1.00 s (1τ)',
  },
  {
    id: 'seed-3',
    mode: 'vertical_drop',
    timeS: 2.0,
    velocityMs: 8.48,
    accelMs2: 1.33,
    positionM: 11.14,
    dragMagN: 12.72,
    massKg: 1.5,
    dragK: 1.5,
    label: 't = 2.00 s (2τ)',
  },
  {
    id: 'seed-4',
    mode: 'vertical_drop',
    timeS: 3.5,
    velocityMs: 9.51,
    accelMs2: 0.3,
    positionM: 24.83,
    dragMagN: 14.27,
    massKg: 1.5,
    dragK: 1.5,
    label: 't = 3.50 s',
  },
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Exact closed-form solution to the linear-drag differential equation:
 *   m * dv/dt = F_drive - k * v,   with v(0) = v0, s(0) = 0.
 *
 * Separation of variables (EK 2.9.A.2.i):
 *   tau = m / k,   v_T = F_drive / k
 *   v(t) = v_T + (v0 - v_T) * exp(-t / tau)
 *   a(t) = dv/dt = ((v_T - v0) / tau) * exp(-t / tau)
 *   s(t) = integral_0^t v(t') dt' = v_T * t + (v0 - v_T) * tau * (1 - exp(-t / tau))
 */
export function solveLinearDragBody(
  massKg: number,
  dragK: number,
  v0: number,
  drivingForceN: number,
  timeS: number,
): LinearDragBodyState {
  const m = Math.max(0.05, massKg);
  const k = Math.max(0.05, dragK);
  const t = Math.max(0, timeS);
  const tauS = m / k;
  const vTerminal = drivingForceN / k;
  const decay = Math.exp(-t / tauS);
  const deltaV0 = v0 - vTerminal;

  const velocityMs = vTerminal + deltaV0 * decay;
  const accelMs2 = (-deltaV0 / tauS) * decay;
  const positionM = vTerminal * t + deltaV0 * tauS * (1 - decay);

  const dragForceN = -k * velocityMs;
  const dragMagN = k * Math.abs(velocityMs);
  const netForceN = drivingForceN + dragForceN;
  const initialAccelMs2 = (drivingForceN - k * v0) / m;

  const xMaxAsymptote = Math.abs(drivingForceN) < 1e-9 ? (m * v0) / k : null;

  const isStartedAtTerminal = Math.abs(deltaV0) < 1e-4;
  const terminalProgressPct = isStartedAtTerminal
    ? 100
    : clamp((1 - decay) * 100, 0, 100);

  const scaleForce = Math.max(1, Math.abs(drivingForceN), k * Math.abs(v0));
  const isAtTerminal = Math.abs(netForceN) / scaleForce < 0.02;

  let regime: LinearDragBodyState['regime'];
  if (Math.abs(drivingForceN) < 1e-9) {
    regime = Math.abs(v0) < 1e-4 ? 'at_rest' : 'coasting_decay';
  } else if (isStartedAtTerminal || isAtTerminal) {
    regime = 'at_terminal';
  } else if (v0 < vTerminal) {
    regime = 'accelerating_to_vt';
  } else {
    regime = 'decelerating_to_vt';
  }

  return {
    massKg: m,
    dragK: k,
    v0,
    drivingForceN,
    tauS,
    vTerminal,
    xMaxAsymptote,
    positionM,
    velocityMs,
    accelMs2,
    dragForceN,
    dragMagN,
    netForceN,
    initialAccelMs2,
    terminalProgressPct,
    isAtTerminal,
    regime,
  };
}

export function evaluateResistive29(params: Resistive29Params): Resistive29Evaluation {
  const t = Math.max(0, params.timeS);

  if (params.mode === 'vertical_drop') {
    const fg = params.massKg * G_GRAVITY;
    const primary = solveLinearDragBody(params.massKg, params.dragK, params.v0, fg, t);
    const maxRec = clamp(Math.ceil(primary.tauS * 5.2 * 2) / 2, 4, 14);
    const keyInsight =
      primary.regime === 'decelerating_to_vt'
        ? `Launched faster than v_T (${primary.v0.toFixed(1)} > ${primary.vTerminal.toFixed(2)} m/s): upward drag exceeds weight (F_r > mg), decelerating the sphere exponentially back to v_T.`
        : primary.regime === 'at_terminal'
          ? `Terminal equilibrium reached: upward resistive drag F_r = ${primary.dragMagN.toFixed(2)} N balances weight mg = ${fg.toFixed(2)} N, so F_net ≈ 0 and a ≈ 0.`
          : `Released below v_T: weight exceeds drag, so speed increases exponentially toward the horizontal asymptote v_T = mg/k = ${primary.vTerminal.toFixed(2)} m/s with τ = m/k = ${primary.tauS.toFixed(2)} s.`;

    return {
      mode: params.mode,
      timeS: t,
      primary,
      secondary: null,
      asymptoteSummary: `v → ${primary.vTerminal.toFixed(2)} m/s, a → 0 m/s², τ = ${primary.tauS.toFixed(2)} s`,
      keyInsight,
      maxRecommendedTimeS: maxRec,
    };
  }

  if (params.mode === 'horizontal_coast') {
    const v0Safe = Math.max(0.5, params.v0);
    const primary = solveLinearDragBody(params.massKg, params.dragK, v0Safe, 0, t);
    const maxRec = clamp(Math.ceil(primary.tauS * 5.2 * 2) / 2, 4, 14);
    const xMax = primary.xMaxAsymptote ?? 0;

    return {
      mode: params.mode,
      timeS: t,
      primary,
      secondary: null,
      asymptoteSummary: `v → 0 m/s, x → x_max = mv₀/k = ${xMax.toFixed(2)} m, τ = ${primary.tauS.toFixed(2)} s`,
      keyInsight: `Pure linear drag F_r = −kv with zero thrust produces exponential velocity decay v(t) = v₀e^(−t/τ) and a finite stopping asymptote x_max = mv₀/k = ${xMax.toFixed(2)} m.`,
      maxRecommendedTimeS: maxRec,
    };
  }

  if (params.mode === 'powered_thrust') {
    const primary = solveLinearDragBody(
      params.massKg,
      params.dragK,
      params.v0,
      params.driveForceN,
      t,
    );
    const maxRec = clamp(Math.ceil(primary.tauS * 5.2 * 2) / 2, 4, 14);

    return {
      mode: params.mode,
      timeS: t,
      primary,
      secondary: null,
      asymptoteSummary: `v → F_drive/k = ${primary.vTerminal.toFixed(2)} m/s, F_r → ${params.driveForceN.toFixed(1)} N`,
      keyInsight: `Terminal velocity (EK 2.9.A.3) occurs for ANY constant driving force: as speed rises, opposing drag F_r = kv catches up to thrust F_drive = ${params.driveForceN.toFixed(1)} N until F_net = 0 at v_T = ${primary.vTerminal.toFixed(2)} m/s.`,
      maxRecommendedTimeS: maxRec,
    };
  }

  // dual_compare (Skill 2.C side-by-side vertical drops)
  const fgA = params.massKg * G_GRAVITY;
  const fgB = params.massBKg * G_GRAVITY;
  const primary = solveLinearDragBody(params.massKg, params.dragK, params.v0, fgA, t);
  const secondary = solveLinearDragBody(params.massBKg, params.dragBK, params.v0B, fgB, t);
  const maxTau = Math.max(primary.tauS, secondary.tauS);
  const maxRec = clamp(Math.ceil(maxTau * 5.2 * 2) / 2, 4, 16);

  const vtRatio = secondary.vTerminal / Math.max(1e-6, primary.vTerminal);
  const tauRatio = secondary.tauS / Math.max(1e-6, primary.tauS);
  const sameTrajectory = Math.abs(vtRatio - 1) < 0.01 && Math.abs(tauRatio - 1) < 0.01 && Math.abs(params.v0 - params.v0B) < 0.05;

  const keyInsight = sameTrajectory
    ? `Identical m/k ratios (${primary.tauS.toFixed(2)} s) yield the EXACT same v_T (${primary.vTerminal.toFixed(2)} m/s) and identical motion curves—even though Lane B has ${params.massBKg.toFixed(1)} kg vs. ${params.massKg.toFixed(1)} kg!`
    : `Lane B has v_T,B / v_T,A = ${vtRatio.toFixed(2)}× and τ_B / τ_A = ${tauRatio.toFixed(2)}×. Notice that when both start from rest (v₀ = 0), both begin with the exact same initial acceleration a(0) = g = 9.81 m/s²!`;

  return {
    mode: params.mode,
    timeS: t,
    primary,
    secondary,
    asymptoteSummary: `v_T,A = ${primary.vTerminal.toFixed(2)} m/s vs. v_T,B = ${secondary.vTerminal.toFixed(2)} m/s`,
    keyInsight,
    maxRecommendedTimeS: maxRec,
  };
}

/**
 * Skill 1.B: Quantitative graph generator with scales, units, asymptotes, and tau markers.
 */
export function buildResistiveChartData(
  params: Resistive29Params,
  kind: ResistiveChartKind,
): ResistiveChartBundle {
  const evalNow = evaluateResistive29(params);
  const pA = evalNow.primary;
  const pB = evalNow.secondary;
  const tHorizon = Math.max(evalNow.maxRecommendedTimeS, params.timeS + 0.5);
  const sampleCount = 90;

  const tauMarkers: Array<{ x: number; label: string }> = [];
  if (kind !== 'fr_vs_v') {
    for (const mult of [1, 2, 3]) {
      const tx = pA.tauS * mult;
      if (tx > 0.05 && tx <= tHorizon * 0.96) {
        tauMarkers.push({ x: tx, label: `${mult}τ` });
      }
    }
  }

  if (kind === 'fr_vs_v') {
    const vPeak = Math.max(
      10,
      pA.vTerminal * 1.25,
      pA.v0 * 1.15,
      pB ? Math.max(pB.vTerminal * 1.25, pB.v0 * 1.15) : 0,
    );
    const curveA: ResistiveChartPoint[] = [];
    const curveB: ResistiveChartPoint[] | null = pB ? [] : null;
    for (let i = 0; i <= 50; i++) {
      const v = (vPeak * i) / 50;
      curveA.push({ x: v, y: pA.dragK * v });
      if (pB && curveB) {
        curveB.push({ x: v, y: pB.dragK * v });
      }
    }
    const yMaxRaw = Math.max(
      pA.dragK * vPeak,
      pA.drivingForceN * 1.15,
      pB ? Math.max(pB.dragK * vPeak, pB.drivingForceN * 1.15) : 0,
      5,
    );
    return {
      kind,
      title: 'Resistive Force Magnitude |F_r| vs. Speed v',
      xLabel: 'Speed v',
      yLabel: 'Drag Force |F_r|',
      xUnit: 'm/s',
      yUnit: 'N',
      xMin: 0,
      xMax: vPeak,
      yMin: 0,
      yMax: yMaxRaw * 1.08,
      curveA,
      curveB,
      currentA: { x: Math.abs(pA.velocityMs), y: pA.dragMagN },
      currentB: pB ? { x: Math.abs(pB.velocityMs), y: pB.dragMagN } : null,
      asymptoteLineA:
        pA.drivingForceN > 0
          ? {
              yStart: pA.drivingForceN,
              yEnd: pA.drivingForceN,
              label:
                params.mode === 'powered_thrust'
                  ? `F_drive = ${pA.drivingForceN.toFixed(1)} N`
                  : `mg_A = ${pA.drivingForceN.toFixed(1)} N`,
            }
          : null,
      asymptoteLineB:
        pB && pB.drivingForceN > 0
          ? {
              yStart: pB.drivingForceN,
              yEnd: pB.drivingForceN,
              label: `mg_B = ${pB.drivingForceN.toFixed(1)} N`,
            }
          : null,
      tauMarkers: [],
      equationCaption: `|F_r(v)| = k·v (slope = k = ${pA.dragK.toFixed(2)} N·s/m); intersects driving force at v_T`,
    };
  }

  const curveA: ResistiveChartPoint[] = [];
  const curveB: ResistiveChartPoint[] | null = pB ? [] : null;
  let yMin = 0;
  let yMax = 1;

  for (let i = 0; i <= sampleCount; i++) {
    const t = (tHorizon * i) / sampleCount;
    const sA = solveLinearDragBody(pA.massKg, pA.dragK, pA.v0, pA.drivingForceN, t);
    const valA =
      kind === 'v_vs_t' ? sA.velocityMs : kind === 'a_vs_t' ? sA.accelMs2 : sA.positionM;
    curveA.push({ x: t, y: valA });
    yMin = Math.min(yMin, valA);
    yMax = Math.max(yMax, valA);

    if (pB && curveB) {
      const sB = solveLinearDragBody(pB.massKg, pB.dragK, pB.v0, pB.drivingForceN, t);
      const valB =
        kind === 'v_vs_t' ? sB.velocityMs : kind === 'a_vs_t' ? sB.accelMs2 : sB.positionM;
      curveB.push({ x: t, y: valB });
      yMin = Math.min(yMin, valB);
      yMax = Math.max(yMax, valB);
    }
  }

  if (kind === 'v_vs_t') {
    yMax = Math.max(yMax, pA.vTerminal * 1.15, pB ? pB.vTerminal * 1.15 : 0, 2);
    yMin = Math.min(0, yMin);
    return {
      kind,
      title: 'Velocity v(t) & Asymptote',
      xLabel: 'Time t',
      yLabel: 'Velocity v',
      xUnit: 's',
      yUnit: 'm/s',
      xMin: 0,
      xMax: tHorizon,
      yMin,
      yMax: yMax * 1.08,
      curveA,
      curveB,
      currentA: { x: evalNow.timeS, y: pA.velocityMs },
      currentB: pB ? { x: evalNow.timeS, y: pB.velocityMs } : null,
      asymptoteLineA: {
        yStart: pA.vTerminal,
        yEnd: pA.vTerminal,
        label:
          params.mode === 'horizontal_coast'
            ? 'v → 0'
            : pB
              ? `v_T,A = ${pA.vTerminal.toFixed(1)}`
              : `v_T = ${pA.vTerminal.toFixed(2)} m/s`,
      },
      asymptoteLineB: pB
        ? {
            yStart: pB.vTerminal,
            yEnd: pB.vTerminal,
            label: `v_T,B = ${pB.vTerminal.toFixed(1)}`,
          }
        : null,
      tauMarkers,
      equationCaption:
        params.mode === 'horizontal_coast'
          ? `v(t) = ${pA.v0.toFixed(1)}·e^(−t/${pA.tauS.toFixed(2)})`
          : `v(t) = ${pA.vTerminal.toFixed(2)} + (${(pA.v0 - pA.vTerminal).toFixed(2)})·e^(−t/${pA.tauS.toFixed(2)})`,
    };
  }

  if (kind === 'a_vs_t') {
    const absBound = Math.max(Math.abs(yMin), Math.abs(yMax), 2);
    const padMin = yMin < -0.05 ? yMin * 1.15 : -0.15 * absBound;
    const padMax = yMax > 0.05 ? yMax * 1.15 : 0.15 * absBound;
    return {
      kind,
      title: 'Acceleration a(t) = dv/dt',
      xLabel: 'Time t',
      yLabel: 'Accel a',
      xUnit: 's',
      yUnit: 'm/s²',
      xMin: 0,
      xMax: tHorizon,
      yMin: padMin,
      yMax: padMax,
      curveA,
      curveB,
      currentA: { x: evalNow.timeS, y: pA.accelMs2 },
      currentB: pB ? { x: evalNow.timeS, y: pB.accelMs2 } : null,
      asymptoteLineA: { yStart: 0, yEnd: 0, label: 'a → 0 m/s²' },
      asymptoteLineB: null,
      tauMarkers,
      equationCaption: `a(t) = ${pA.initialAccelMs2.toFixed(2)}·e^(−t/${pA.tauS.toFixed(2)}) m/s² (exponentially decays to 0)`,
    };
  }

  // x_vs_t
  if (pA.xMaxAsymptote !== null) {
    yMax = Math.max(yMax, pA.xMaxAsymptote * 1.15);
  }
  const asymptoteLineA =
    pA.xMaxAsymptote !== null
      ? {
          yStart: pA.xMaxAsymptote,
          yEnd: pA.xMaxAsymptote,
          label: `x_max = ${pA.xMaxAsymptote.toFixed(2)} m`,
        }
      : {
          yStart: (pA.v0 - pA.vTerminal) * pA.tauS,
          yEnd: pA.vTerminal * tHorizon + (pA.v0 - pA.vTerminal) * pA.tauS,
          label: `oblique slope v_T = ${pA.vTerminal.toFixed(1)}`,
        };

  return {
    kind,
    title:
      params.mode === 'horizontal_coast'
        ? 'Position x(t) & Stopping Asymptote x_max'
        : 'Displacement s(t) = ∫ v(t) dt',
    xLabel: 'Time t',
    yLabel: params.mode === 'vertical_drop' || params.mode === 'dual_compare' ? 'Fall Depth y' : 'Position x',
    xUnit: 's',
    yUnit: 'm',
    xMin: 0,
    xMax: tHorizon,
    yMin: 0,
    yMax: Math.max(yMax * 1.08, 2),
    curveA,
    curveB,
    currentA: { x: evalNow.timeS, y: pA.positionM },
    currentB: pB ? { x: evalNow.timeS, y: pB.positionM } : null,
    asymptoteLineA,
    asymptoteLineB: null,
    tauMarkers,
    equationCaption:
      pA.xMaxAsymptote !== null
        ? `x(t) = ${pA.xMaxAsymptote.toFixed(2)}·(1 − e^(−t/${pA.tauS.toFixed(2)}))`
        : `s(t) = ${pA.vTerminal.toFixed(2)}t + (${((pA.v0 - pA.vTerminal) * pA.tauS).toFixed(2)})·(1 − e^(−t/${pA.tauS.toFixed(2)}))`,
  };
}

/**
 * Skill 2.A: Step-by-step symbolic calculus derivation using separation of variables.
 */
export function buildDerivationSteps29(
  params: Resistive29Params,
  evalState: Resistive29Evaluation,
): DerivationStep29[] {
  const p = evalState.primary;
  const t = evalState.timeS;

  if (params.mode === 'horizontal_coast') {
    const xMax = p.xMaxAsymptote ?? 0;
    return [
      {
        stepNumber: 1,
        title: "Newton's Second Law ODE",
        ekCode: '2.9.A.1–2',
        symbolicFormula: 'm (dv/dt) = −k·v',
        liveSubstitution: `${p.massKg.toFixed(2)} (dv/dt) = −${p.dragK.toFixed(2)}·v  ⇒  dv/dt = −(${(1 / p.tauS).toFixed(2)} s⁻¹)v`,
        explanation:
          'Only the velocity-dependent resistive force opposes motion along the track, yielding a first-order separable differential equation.',
      },
      {
        stepNumber: 2,
        title: 'Separate Variables & Integrate',
        ekCode: '2.9.A.2.i',
        symbolicFormula: '∫[v₀ → v] (dv′ / v′) = −(k/m) ∫[0 → t] dt′',
        liveSubstitution: `ln(v / ${p.v0.toFixed(1)}) = −t / ${p.tauS.toFixed(2)} s`,
        explanation:
          'Group all v-terms with dv on the left and dt on the right, applying definite limits from initial velocity v₀ at t = 0 to v(t) at time t.',
      },
      {
        stepNumber: 3,
        title: 'Exponential Velocity Decay',
        ekCode: '2.9.A.2.iii',
        symbolicFormula: 'v(t) = v₀ · e^(−kt/m) = v₀ · e^(−t/τ)',
        liveSubstitution: `v(${t.toFixed(2)} s) = ${p.v0.toFixed(1)} · e^(−${t.toFixed(2)}/${p.tauS.toFixed(2)}) = ${p.velocityMs.toFixed(2)} m/s`,
        explanation:
          'Exponentiating both sides produces exponential decay with characteristic time constant τ = m/k and horizontal asymptote v → 0.',
      },
      {
        stepNumber: 4,
        title: 'Calculus for a(t) and x(t)',
        ekCode: '2.9.A.2.ii',
        symbolicFormula: 'a(t) = dv/dt = −(v₀/τ)e^(−t/τ),   x(t) = ∫₀ᵗ v dt′ = (mv₀/k)(1 − e^(−t/τ))',
        liveSubstitution: `a = ${p.accelMs2.toFixed(2)} m/s²,  x(${t.toFixed(2)} s) = ${xMax.toFixed(2)}(1 − e^(−t/τ)) = ${p.positionM.toFixed(2)} m`,
        explanation:
          'Differentiating v(t) yields negative exponential acceleration; integrating v(t) from 0 to t yields position approaching a finite wall.',
      },
      {
        stepNumber: 5,
        title: 'Finite Stopping Asymptote',
        ekCode: '2.9.A.2.iii',
        symbolicFormula: 'lim(t→∞) x(t) = x_max = m·v₀ / k = v₀·τ',
        liveSubstitution: `x_max = (${p.massKg.toFixed(2)} × ${p.v0.toFixed(1)}) / ${p.dragK.toFixed(2)} = ${xMax.toFixed(2)} m`,
        explanation:
          'Even though speed decays asymptotically toward zero forever, the definite integral converges to a finite maximum stopping distance x_max.',
      },
    ];
  }

  const driveSym = params.mode === 'powered_thrust' ? 'F_drive' : 'mg';
  const driveVal = p.drivingForceN.toFixed(2);
  const deltaV0 = p.v0 - p.vTerminal;

  return [
    {
      stepNumber: 1,
      title: "Newton's Second Law ODE",
      ekCode: '2.9.A.1–2',
      symbolicFormula: `m (dv/dt) = ${driveSym} − k·v`,
      liveSubstitution: `${p.massKg.toFixed(2)} (dv/dt) = ${driveVal} N − ${p.dragK.toFixed(2)}·v`,
      explanation: `Constant driving force ${driveSym} pushes forward while resistive force F_r = −kv opposes velocity, giving a linear first-order ODE.`,
    },
    {
      stepNumber: 2,
      title: 'Separation of Variables (Definite Limits)',
      ekCode: '2.9.A.2.i',
      symbolicFormula: `∫[v₀ → v] dv′ / (v′ − ${driveSym}/k) = −(k/m) ∫[0 → t] dt′`,
      liveSubstitution: `ln|(v − ${p.vTerminal.toFixed(2)}) / (${deltaV0.toFixed(2)})| = −t / ${p.tauS.toFixed(2)} s`,
      explanation:
        'Factor out −k/m to isolate v_T = ' +
        driveSym +
        '/k, separate variables, and integrate over the exact initial condition v(0) = v₀.',
    },
    {
      stepNumber: 3,
      title: 'Exponential Velocity Solution',
      ekCode: '2.9.A.2.iii',
      symbolicFormula: `v(t) = v_T + (v₀ − v_T)e^(−t/τ),   v_T = ${driveSym}/k,   τ = m/k`,
      liveSubstitution: `v(${t.toFixed(2)} s) = ${p.vTerminal.toFixed(2)} + (${deltaV0.toFixed(2)})e^(−${t.toFixed(2)}/${p.tauS.toFixed(2)}) = ${p.velocityMs.toFixed(2)} m/s`,
      explanation:
        'Speed approaches v_T exponentially from below (if v₀ < v_T) or from above (if v₀ > v_T) with the exact same time constant τ = m/k.',
    },
    {
      stepNumber: 4,
      title: 'Acceleration & Position via Calculus',
      ekCode: '2.9.A.2.ii',
      symbolicFormula: 'a(t) = dv/dt = ((v_T − v₀)/τ)e^(−t/τ),   s(t) = v_T·t + (v₀ − v_T)τ(1 − e^(−t/τ))',
      liveSubstitution: `a(${t.toFixed(2)} s) = ${p.accelMs2.toFixed(2)} m/s²,   s(${t.toFixed(2)} s) = ${p.positionM.toFixed(2)} m`,
      explanation:
        'Because acceleration changes continuously with v, constant-acceleration kinematics do NOT apply; use calculus directly on v(t).',
    },
    {
      stepNumber: 5,
      title: 'Terminal Velocity Condition (F_net = 0)',
      ekCode: '2.9.A.3',
      symbolicFormula: `a = 0  ⇔  ${driveSym} − k·v_T = 0  ⇒  v_T = ${driveSym} / k`,
      liveSubstitution: `v_T = ${driveVal} / ${p.dragK.toFixed(2)} = ${p.vTerminal.toFixed(2)} m/s   (${p.terminalProgressPct.toFixed(1)}% reached)`,
      explanation:
        'Terminal velocity is achieved asymptotically when the opposing resistive force matches the constant driving force so net force vanishes.',
    },
  ];
}

/**
 * Skill 2.C: Quantitative comparison rows (Lane A vs Lane B OR t=0 vs t=τ vs t→∞).
 */
export function buildComparisonRows29(
  params: Resistive29Params,
  evalState: Resistive29Evaluation,
): { headerA: string; headerB: string; rows: ComparisonRow29[] } {
  const pA = evalState.primary;
  const pB = evalState.secondary;

  if (params.mode === 'dual_compare' && pB) {
    return {
      headerA: `Lane A (${pA.massKg.toFixed(1)} kg, k=${pA.dragK.toFixed(1)})`,
      headerB: `Lane B (${pB.massKg.toFixed(1)} kg, k=${pB.dragK.toFixed(1)})`,
      rows: [
        {
          metric: 'Initial Accel a(0)',
          colA: `${pA.initialAccelMs2.toFixed(2)} m/s²`,
          colB: `${pB.initialAccelMs2.toFixed(2)} m/s²`,
          ratioOrNote:
            Math.abs(pA.v0) < 0.05 && Math.abs(pB.v0) < 0.05
              ? 'Both = g (independent of m, k!)'
              : `Δa₀ = ${(pB.initialAccelMs2 - pA.initialAccelMs2).toFixed(2)} m/s²`,
        },
        {
          metric: 'Time Constant τ = m/k',
          colA: `${pA.tauS.toFixed(2)} s`,
          colB: `${pB.tauS.toFixed(2)} s`,
          ratioOrNote: `B / A = ${(pB.tauS / pA.tauS).toFixed(2)}×`,
        },
        {
          metric: 'Terminal Speed v_T = mg/k',
          colA: `${pA.vTerminal.toFixed(2)} m/s`,
          colB: `${pB.vTerminal.toFixed(2)} m/s`,
          ratioOrNote: `B / A = ${(pB.vTerminal / pA.vTerminal).toFixed(2)}×`,
        },
        {
          metric: `Speed at t = ${evalState.timeS.toFixed(2)} s`,
          colA: `${pA.velocityMs.toFixed(2)} m/s`,
          colB: `${pB.velocityMs.toFixed(2)} m/s`,
          ratioOrNote: `${pB.velocityMs >= pA.velocityMs ? 'B faster' : 'A faster'} by ${Math.abs(pB.velocityMs - pA.velocityMs).toFixed(2)} m/s`,
        },
        {
          metric: `Drag |F_r| at t = ${evalState.timeS.toFixed(2)} s`,
          colA: `${pA.dragMagN.toFixed(2)} N`,
          colB: `${pB.dragMagN.toFixed(2)} N`,
          ratioOrNote: `Limit: ${pA.drivingForceN.toFixed(1)} vs ${pB.drivingForceN.toFixed(1)} N`,
        },
      ],
    };
  }

  // Single-body instant comparison: t = 0 vs t = τ (and asymptotic limit note)
  const at0 = solveLinearDragBody(pA.massKg, pA.dragK, pA.v0, pA.drivingForceN, 0);
  const atTau = solveLinearDragBody(pA.massKg, pA.dragK, pA.v0, pA.drivingForceN, pA.tauS);

  return {
    headerA: 'At Release (t = 0)',
    headerB: `At t = 1τ (${pA.tauS.toFixed(2)} s)`,
    rows: [
      {
        metric: 'Speed v(t)',
        colA: `${at0.velocityMs.toFixed(2)} m/s`,
        colB: `${atTau.velocityMs.toFixed(2)} m/s`,
        ratioOrNote: `t→∞: ${pA.vTerminal.toFixed(2)} m/s (63.2% step at 1τ)`,
      },
      {
        metric: 'Acceleration a(t)',
        colA: `${at0.accelMs2.toFixed(2)} m/s²`,
        colB: `${atTau.accelMs2.toFixed(2)} m/s²`,
        ratioOrNote: 'Drops to 1/e (36.8%) of a(0) at 1τ; → 0',
      },
      {
        metric: 'Resistive Drag |F_r|',
        colA: `${at0.dragMagN.toFixed(2)} N`,
        colB: `${atTau.dragMagN.toFixed(2)} N`,
        ratioOrNote: `t→∞: ${pA.drivingForceN.toFixed(2)} N`,
      },
      {
        metric: 'Net Force F_net',
        colA: `${at0.netForceN.toFixed(2)} N`,
        colB: `${atTau.netForceN.toFixed(2)} N`,
        ratioOrNote: 't→∞: 0.00 N (dynamic equilibrium)',
      },
      {
        metric: 'Displacement s(t)',
        colA: '0.00 m',
        colB: `${atTau.positionM.toFixed(2)} m`,
        ratioOrNote:
          pA.xMaxAsymptote !== null
            ? `t→∞: x_max = ${pA.xMaxAsymptote.toFixed(2)} m`
            : `t→∞: slope → ${pA.vTerminal.toFixed(2)} m/s`,
      },
    ],
  };
}

export const COMPARISON_CHALLENGES_29: ComparisonChallenge29[] = [
  {
    id: 'comp-2c-1',
    prompt:
      'Spheres A (mass m) and B (mass 2m) have the SAME linear drag coefficient k and are dropped from rest. How do their initial acceleration a(0) and terminal speed v_T compare?',
    options: [
      'a_B(0) = 2 a_A(0) and v_T,B = 2 v_T,A',
      'a_B(0) = a_A(0) = g and v_T,B = 2 v_T,A',
      'a_B(0) = a_A(0) = g and v_T,B = v_T,A',
    ],
    correctIndex: 1,
    explanation:
      'At t = 0 with v₀ = 0, F_r = 0 so both have a(0) = mg/m = g. At terminal velocity, kv_T = mg ⇒ v_T = mg/k, so doubling m doubles v_T (and doubles τ = m/k).',
    ekCode: '2.9.A.3',
  },
  {
    id: 'comp-2c-2',
    prompt:
      'Sphere A is dropped from rest (v₀ = 0). Identical Sphere B is thrown downward at v₀ = 2 v_T. Compare the magnitude and direction of their accelerations at t = 0.',
    options: [
      'a_A = g downward; a_B = g upward (same magnitude, opposite direction)',
      'a_A = g downward; a_B = 2g upward',
      'a_A = g downward; a_B = 0 because it already passed v_T',
    ],
    correctIndex: 0,
    explanation:
      'For B at v₀ = 2v_T = 2mg/k, upward drag is F_r = k(2v_T) = 2mg. Net force is mg − 2mg = −mg (upward), giving a_B(0) = −g (same magnitude as a_A = +g, opposite sign!).',
    ekCode: '2.9.A.1–2',
  },
  {
    id: 'comp-2c-3',
    prompt:
      'A sphere with (m, k) is compared to a sphere with (2m, 2k), both dropped from rest. How does the second sphere’s v(t) graph compare?',
    options: [
      'Higher v_T because mass doubled',
      'Same v_T, but reaches terminal speed twice as fast',
      'Identical v(t) curve at every instant t ≥ 0',
    ],
    correctIndex: 2,
    explanation:
      'Both v_T = mg/k and τ = m/k depend solely on the ratio m/k. Doubling both m and k leaves m/k unchanged, producing the exact same v(t), a(t), and y(t) curves.',
    ekCode: '2.9.A.2.iii',
  },
];

export const LAB_PROCEDURES_29: LabProcedure29[] = [
  {
    id: 'lab-coffee-filters',
    title: 'Lab 1: Determining Drag Coefficient k with Stacked Coffee Filters',
    objective:
      'Experimentally verify linear drag F_r = −kv and determine k from terminal velocity measurements.',
    equipment: [
      'Identical nested paper coffee filters (mass N·m₁, same shape ⇒ same k)',
      'Digital balance (measure single filter mass m₁)',
      'Ultrasonic motion detector (or 60 fps video + meterstick)',
      '2.0 m vertical drop zone clear of air currents',
    ],
    question:
      'To determine k cleanly from a linear best-fit graph across N = 1, 2, 3, 4, 5 stacked filters, what should you plot on the vertical and horizontal axes?',
    options: [
      'Plot total fall time t_total vs. mass N·m₁; slope equals k',
      'Plot weight W = N·m₁·g (vertical) vs. measured constant terminal speed v_T (horizontal); slope equals k',
      'Plot v_T² vs. drop height H; slope equals 2k',
    ],
    correctIndex: 1,
    explanation:
      'At terminal velocity (flat plateau on the motion detector v vs. t graph), F_net = 0 so F_r = kv_T = W = N·m₁g. Plotting W vs. v_T yields a straight line through the origin with slope k!',
    linearizationFormula: 'W = N·m₁·g = k · v_T   ⇒   slope(W vs. v_T) = k',
  },
  {
    id: 'lab-glider-asymptote',
    title: 'Lab 2: Verifying Exponential Decay & Stopping Asymptote x_max',
    objective:
      'Measure the time constant τ = m/k of a magnetically or fluid-damped glider coasting with zero driving force.',
    equipment: [
      'Low-friction air track with aluminum fin passing through a magnetic/viscous damper',
      'Motion sensor logging x(t) and v(t) at 50 Hz',
      'Slotted masses to vary glider mass m',
      'Spring launcher for repeatable initial speed v₀',
    ],
    question:
      'Given v(t) data from the motion sensor while the glider coasts (F_drive = 0), which linearized graph directly yields −k/m as its slope?',
    options: [
      'Plot ln(v) vs. t; slope = −k/m = −1/τ and y-intercept = ln(v₀)',
      'Plot 1/v vs. t; slope = k/m',
      'Plot x vs. t²; slope = −k/(2m)',
    ],
    correctIndex: 0,
    explanation:
      'Taking the natural log of v(t) = v₀e^(−kt/m) gives ln(v) = ln(v₀) − (k/m)t. A straight-line fit confirms linear drag F_r = −kv and directly yields −1/τ = −k/m.',
    linearizationFormula: 'ln(v(t)) = ln(v₀) − (k/m)·t   ⇒   slope = −1/τ',
  },
];

export const CLAIM_CARDS_29: ClaimCard29[] = [
  {
    id: 'claim-29-1',
    ekCode: '2.9.A.1',
    statement:
      'A linear resistive force F_r = −kv always points in the opposite direction of the object’s instantaneous velocity vector.',
    isTrue: true,
    justification:
      'True (EK 2.9.A.1). The negative sign in F_r = −kv guarantees that resistive drag opposes the instantaneous direction of motion regardless of whether the object is speeding up or slowing down.',
  },
  {
    id: 'claim-29-2',
    ekCode: '2.9.A.2.ii',
    statement:
      'Because gravity is constant, you can use v² = v₀² + 2aΔy with a = g − kv/m to find the speed after falling distance Δy.',
    isTrue: false,
    justification:
      'False (EK 2.9.A.2.ii). Acceleration a(t) = (mg − kv)/m changes continuously with velocity, so constant-acceleration kinematics are invalid; you must integrate the differential equation.',
  },
  {
    id: 'claim-29-3',
    ekCode: '2.9.A.3',
    statement:
      'If a sphere is thrown straight downward faster than its terminal speed (v₀ > v_T), it will decelerate asymptotically back toward the exact same terminal speed v_T = mg/k.',
    isTrue: true,
    justification:
      'True (EK 2.9.A.2.iii & 2.9.A.3). When v₀ > v_T, upward drag kv exceeds weight mg, making net force upward until v decays exponentially back to v_T where kv_T = mg.',
  },
  {
    id: 'claim-29-4',
    ekCode: '2.9.A.2.iii',
    statement:
      'A glider coasting horizontally under F_r = −kv with zero thrust travels an infinite distance because v(t) = v₀e^(−t/τ) never reaches zero in finite time.',
    isTrue: false,
    justification:
      'False (EK 2.9.A.2.iii). Integrating v(t) gives x(t) = (mv₀/k)(1 − e^(−t/τ)), which approaches a FINITE horizontal position asymptote x_max = mv₀/k.',
  },
  {
    id: 'claim-29-5',
    ekCode: '2.9.A.3',
    statement:
      'At terminal velocity, all forces on the falling object disappear so there is no longer any resistive drag acting on it.',
    isTrue: false,
    justification:
      'False (EK 2.9.A.3). Both gravity mg and resistive drag F_r = kv_T are still acting at full strength—they simply have equal magnitudes and opposite directions so F_net = 0.',
  },
  {
    id: 'claim-29-6',
    ekCode: '2.9.A.2.iii',
    statement:
      'After one characteristic time constant t = τ = m/k from rest, a falling sphere reaches 63.2% of its terminal speed while its acceleration drops to 36.8% of g.',
    isTrue: true,
    justification:
      'True (EK 2.9.A.2.iii). At t = τ, e^(−1) ≈ 0.3679, so v(τ) = v_T(1 − e⁻¹) ≈ 0.632 v_T and a(τ) = g·e⁻¹ ≈ 0.368 g.',
  },
];
