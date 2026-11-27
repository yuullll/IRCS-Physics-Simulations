import type { Unit1SubtopicDisplay } from './unit1-card-motion';
import { UNIT1_HERO_SUMMARY, UNIT1_SUBTOPIC_DISPLAY } from './unit1-card-motion';

export type UnitThemeVariant = 'mechanics' | 'em';

export interface UnitThemePalette {
  course: UnitThemeVariant;
  eyebrow: string;
  canvasBg: string;
  canvasGlow: string;
  cardBgClass: string;
  cardBorderHoverClass: string;
  cardShadowHoverClass: string;
  cardFocusRingClass: string;
  topSheenClass: string;
  spotSurfaceGradient: string;
  spotBorderGradient: string;
  accentTextClass: string;
  accentTextHoverClass: string;
  accentPillClass: string;
  accentDotClass: string;
  eqBoxClass: string;
  eqSubTextClass: string;
  svgPrimaryStroke: string;
  svgHighlightStroke: string;
  svgSecondaryStroke: string;
  svgMutedStroke: string;
  svgGlowColor: string;
  /** Matching top floating menu bar styles when navigating in Unit Selection */
  topBarContainerClass: string;
  topBarButtonClass: string;
  topBarIconClass: string;
  topBarBreadcrumbClass: string;
}

export const UNIT_THEME_PALETTES: Record<UnitThemeVariant, UnitThemePalette> = {
  mechanics: {
    course: 'mechanics',
    eyebrow: 'AP PHYSICS C: MECHANICS',
    canvasBg: '#060d0f',
    canvasGlow:
      'radial-gradient(ellipse 75% 42% at 50% -4%, rgba(16, 185, 129, 0.12), transparent 62%), radial-gradient(circle at 82% 28%, rgba(20, 184, 166, 0.08), transparent 45%)',
    cardBgClass: 'bg-[#0b171b]/84 border-slate-700/45',
    cardBorderHoverClass: 'hover:border-emerald-400/38',
    cardShadowHoverClass: 'hover:shadow-[0_24px_56px_-22px_rgba(16,185,129,0.28)]',
    cardFocusRingClass: 'focus-visible:ring-emerald-400/75 focus-visible:ring-offset-[#060d0f]',
    topSheenClass: 'from-emerald-300/[0.06] via-teal-400/[0.015] to-transparent',
    spotSurfaceGradient:
      'rgba(52, 211, 153, 0.135), rgba(45, 212, 191, 0.045) 42%, transparent 72%',
    spotBorderGradient:
      'rgba(94, 234, 212, 0.72), rgba(16, 185, 129, 0.24) 45%, transparent 74%',
    accentTextClass: 'text-emerald-300',
    accentTextHoverClass: 'group-hover:text-emerald-200',
    accentPillClass: 'bg-emerald-500/[0.11] border-emerald-400/25 text-emerald-300',
    accentDotClass: 'bg-emerald-300',
    eqBoxClass: 'bg-[#061014]/90 border-slate-700/50 group-hover:border-emerald-400/35',
    eqSubTextClass: 'text-emerald-200/85',
    svgPrimaryStroke: '#2dd4bf',
    svgHighlightStroke: '#6ee7b7',
    svgSecondaryStroke: '#94a3b8',
    svgMutedStroke: '#475569',
    svgGlowColor: '#2dd4bf',
    topBarContainerClass:
      'bg-[#0b171b]/88 border-slate-700/50 shadow-[0_14px_34px_-14px_rgba(2,10,14,0.9)]',
    topBarButtonClass:
      'bg-[#0f1f25]/85 hover:bg-[#142a32] text-slate-200 hover:text-white border-slate-700/60 hover:border-emerald-400/40',
    topBarIconClass: 'text-emerald-300',
    topBarBreadcrumbClass: 'text-emerald-300',
  },
  em: {
    course: 'em',
    eyebrow: 'AP PHYSICS C: ELECTRICITY & MAGNETISM',
    canvasBg: '#060a15',
    canvasGlow:
      'radial-gradient(ellipse 75% 42% at 50% -4%, rgba(56, 189, 248, 0.13), transparent 62%), radial-gradient(circle at 82% 28%, rgba(99, 102, 241, 0.085), transparent 45%)',
    cardBgClass: 'bg-[#0c1528]/84 border-slate-700/45',
    cardBorderHoverClass: 'hover:border-sky-400/40',
    cardShadowHoverClass: 'hover:shadow-[0_24px_56px_-22px_rgba(56,189,248,0.28)]',
    cardFocusRingClass: 'focus-visible:ring-sky-400/75 focus-visible:ring-offset-[#060a15]',
    topSheenClass: 'from-sky-300/[0.06] via-cyan-400/[0.015] to-transparent',
    spotSurfaceGradient:
      'rgba(56, 189, 248, 0.14), rgba(34, 211, 238, 0.05) 42%, transparent 72%',
    spotBorderGradient:
      'rgba(125, 211, 252, 0.75), rgba(56, 189, 248, 0.25) 45%, transparent 74%',
    accentTextClass: 'text-sky-300',
    accentTextHoverClass: 'group-hover:text-sky-200',
    accentPillClass: 'bg-sky-500/[0.12] border-sky-400/25 text-sky-300',
    accentDotClass: 'bg-sky-300',
    eqBoxClass: 'bg-[#070e1d]/90 border-slate-700/50 group-hover:border-sky-400/35',
    eqSubTextClass: 'text-sky-200/85',
    svgPrimaryStroke: '#38bdf8',
    svgHighlightStroke: '#7dd3fc',
    svgSecondaryStroke: '#94a3b8',
    svgMutedStroke: '#475569',
    svgGlowColor: '#38bdf8',
    topBarContainerClass:
      'bg-[#0c1528]/88 border-slate-700/50 shadow-[0_14px_34px_-14px_rgba(2,6,20,0.9)]',
    topBarButtonClass:
      'bg-[#101d35]/85 hover:bg-[#162746] text-slate-200 hover:text-white border-slate-700/60 hover:border-sky-400/40',
    topBarIconClass: 'text-sky-300',
    topBarBreadcrumbClass: 'text-sky-300',
  },
};

export function getUnitThemePalette(course: UnitThemeVariant): UnitThemePalette {
  return UNIT_THEME_PALETTES[course];
}

/** Concise 2-line Hero summaries for all 13 AP Physics C units */
export const UNIT_HERO_SUMMARIES: Record<string, string> = {
  'unit-1-kinematics': UNIT1_HERO_SUMMARY,
  'unit-2-dynamics':
    'Investigate how forces govern changes in motion using Newton’s laws, free-body diagrams, gravitation, friction, springs, resistive drag, and circular dynamics.',
  'unit-3-work-energy':
    'Apply scalar work-energy integrals, conservative potential functions, mechanical energy conservation, and power to analyze variable-force systems.',
  'unit-4-momentum':
    'Examine impulse-momentum relations, isolated-system conservation laws, multi-dimensional collisions, and center-of-mass motion under external forces.',
  'unit-5-rotation':
    'Extend dynamics to rigid bodies by integrating rotational inertia and applying torque and angular acceleration to pivoted and rolling systems.',
  'unit-6-rotating-energy':
    'Synthesize translational and rotational mechanics through rolling without slipping, rotational kinetic energy, and angular momentum conservation.',
  'unit-7-oscillations':
    'Solve second-order restoring-force differential equations to model simple harmonic motion, phase relationships, periods, and energy exchange.',
  'unit-8-electrostatics':
    'Explore static charges, Coulomb superposition, continuous charge-distribution integrals, electric flux, and Gauss’s law across symmetric geometries.',
  'unit-9-potential':
    'Model electrostatic interactions through scalar potential differences, field-gradient relationships, equipotential surfaces, and stored system energy.',
  'unit-10-capacitors':
    'Analyze electrostatic equilibrium in conductors, geometric capacitance models, dielectric polarization, and energy density stored in electric fields.',
  'unit-11-circuits':
    'Evaluate steady-state and transient charge flow using Ohm’s law, Kirchhoff’s loop and junction rules, and first-order RC differential equations.',
  'unit-12-magnetism':
    'Investigate magnetic forces on moving charges and currents alongside Biot-Savart integration and Ampère’s law for symmetric magnetic fields.',
  'unit-13-induction':
    'Connect changing magnetic flux to induced electromotive force via Faraday’s law, Lenz’s law, motional emf, self-inductance, and magnetic energy.',
};

/** Scannable titles & strictly single-sentence descriptions for all 22 live 3D simulation subtopics */
export const ALL_SUBTOPIC_DISPLAY: Record<string, Unit1SubtopicDisplay> = {
  ...UNIT1_SUBTOPIC_DISPLAY,

  // Unit 2: Force and Translational Dynamics (2.1 – 2.10)
  'sub-2-1': {
    code: '2.1',
    title: 'Systems & Center of Mass',
    description:
      'Locate discrete and nonuniform continuous centers of mass and compare internal motion with system trajectories.',
    diagramLabel: 'Multi-mass particle constellation converging on a central center-of-mass node',
  },
  'sub-2-2': {
    code: '2.2',
    title: 'Forces & Free-Body Diagrams',
    description:
      'Isolate system interactions, align inclined coordinate axes, and construct accurate free-body diagrams.',
    diagramLabel: 'Block on an inclined plane showing normal, gravity, and surface force vectors',
  },
  'sub-2-3': {
    code: '2.3',
    title: 'Newton’s Third Law & Tension',
    description:
      'Verify action-reaction force pairs, prove internal force cancellation, and compare ideal versus massive strings.',
    diagramLabel: 'Pulley system with two suspended blocks and paired equal-and-opposite tension arrows',
  },
  'sub-2-4': {
    code: '2.4',
    title: 'Newton’s First Law & Equilibrium',
    description:
      'Balance multi-vector force tables, verify constant-velocity cruise, and distinguish inertial reference frames.',
    diagramLabel: 'Central mass held in static equilibrium by four balanced orthogonal force arrows',
  },
  'sub-2-5': {
    code: '2.5',
    title: 'Newton’s Second Law & Dynamics',
    description:
      'Measure net-force acceleration alignment, run Modified Atwood transfers, and analyze system center-of-mass motion.',
    diagramLabel: 'Modified Atwood cart on a horizontal track pulled over a pulley by a hanging mass',
  },
  'sub-2-6': {
    code: '2.6',
    title: 'Gravitational Force & Shell Theorem',
    description:
      'Explore inverse-square gravitation, apparent weight equivalence, and internal fields inside spheres and shells.',
    diagramLabel: 'Planetary body and orbiting satellite linked by opposing gravitational attraction vectors',
  },
  'sub-2-7': {
    code: '2.7',
    title: 'Kinetic & Static Friction',
    description:
      'Sweep applied pulls past static breakaway, find critical incline angles, and test multi-block friction pairs.',
    diagramLabel: 'Block on a rough surface showing applied pull, normal force, and opposing friction vector',
  },
  'sub-2-8': {
    code: '2.8',
    title: 'Spring Forces & Equivalent k',
    description:
      'Compare ideal and nonlinear springs, inspect vertical equilibrium shifts, and test series versus parallel combinations.',
    diagramLabel: 'Coiled wall-mounted spring connected to a displaced mass block with restoring force arrow',
  },
  'sub-2-9': {
    code: '2.9',
    title: 'Resistive Forces & Terminal Velocity',
    description:
      'Solve linear drag differential equations, trace exponential asymptotes, and race objects toward terminal speed.',
    diagramLabel: 'Exponential velocity curve asymptotically approaching a horizontal terminal speed line',
  },
  'sub-2-10': {
    code: '2.10',
    title: 'Circular Motion & Orbits',
    description:
      'Analyze vertical loops, banked turns, conical pendulums, and Kepler’s third law for circular orbits.',
    diagramLabel: 'Circular trajectory showing tangential velocity vector and inward centripetal acceleration',
  },

  // Unit 3: Work, Energy, and Power (3.1)
  'sub-3-1': {
    code: '3.1',
    title: 'Translational Kinetic Energy',
    description:
      'Explore quadratic speed scaling, verify scalar direction invariance, and compare kinetic energy across moving reference frames.',
    diagramLabel: 'Parabolic K versus v curve paired with a sliding mass block and velocity vector',
  },

  // Unit 8: Electric Charges, Fields, and Gauss's Law (8.1 – 8.6)
  'sub-8-1': {
    code: '8.1',
    title: 'Electric Charge & Coulomb Force',
    description:
      'Test inverse-square superposition across point charges, vary dielectric permittivity, and compare with gravity.',
    diagramLabel: 'Positive and negative point charges separated by distance r with opposing force vectors',
  },
  'sub-8-2': {
    code: '8.2',
    title: 'Conservation of Charge & Charging',
    description:
      'Track electron flow during friction and contact, induce polarization, and execute four-step Earth grounding.',
    diagramLabel: 'Two polarized spheres showing charge transfer arc and conservation balance',
  },
  'sub-8-3': {
    code: '8.3',
    title: 'Electric Fields & Lorentz Dynamics',
    description:
      'Deploy point charges, slice 3D equipotential fields, and trace test-particle motion under electric and magnetic forces.',
    diagramLabel: 'Curved dipole electric field lines with a test charge and tangent field arrow',
  },
  'sub-8-4': {
    code: '8.4',
    title: 'Fields of Charge Distributions',
    description:
      'Integrate electric fields across rings, arcs, and rods while comparing Riemann sums with exact calculus.',
    diagramLabel: 'Charged ring element dq projecting symmetric field contributions along the central axis',
  },
  'sub-8-5': {
    code: '8.5',
    title: 'Electric Flux & Surface Integrals',
    description:
      'Tilt open surfaces through uniform fields, sum patch integrals, and audit flux across closed cube faces.',
    diagramLabel: 'Tilted rectangular area surface pierced by electric field lines with outward normal dA',
  },
  'sub-8-6': {
    code: '8.6',
    title: 'Gauss’s Law & Symmetry',
    description:
      'Verify Gaussian surface size invariance, integrate radial charge densities, and derive symmetric electric fields.',
    diagramLabel: 'Dashed Gaussian sphere enclosing a central charge with outward radial electric field vectors',
  },

  // Unit 11 Summary: 3D Circuit Workbench
  'sub-11-summary': {
    code: 'Summary',
    title: '3D Circuit Workbench & MNA Solver',
    description:
      'Build series, parallel, RC filter, and bridge circuits on a 3D breadboard with live meters and oscilloscopes.',
    diagramLabel: 'Closed circuit schematic with voltage source, resistor network, and circulating current arrow',
  },
};

export function getUnitHeroSummary(unitId: string, fallbackIntro: string): string {
  return UNIT_HERO_SUMMARIES[unitId] ?? fallbackIntro;
}

export function getSubtopicDisplayMeta(
  subtopicId: string,
  code: string,
  fallbackTitle: string,
  fallbackDescription: string
): Unit1SubtopicDisplay {
  const override = ALL_SUBTOPIC_DISPLAY[subtopicId];
  if (override) {
    return override;
  }
  return {
    code,
    title: fallbackTitle,
    description: fallbackDescription,
    diagramLabel: `Physics diagram for subtopic ${code}`,
  };
}
