export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CursorCardMetrics {
  /** Cursor X offset relative to card left edge in px */
  spotX: number;
  /** Cursor Y offset relative to card top edge in px */
  spotY: number;
  /** Normalized horizontal offset from center in [-1, 1] */
  normX: number;
  /** Normalized vertical offset from center in [-1, 1] */
  normY: number;
  /** Subtle perspective pitch rotation in degrees (rotateX) */
  tiltX: number;
  /** Subtle perspective yaw rotation in degrees (rotateY) */
  tiltY: number;
  /** 1 when cursor spotlight is active, 0 when resting or reduced motion */
  active: number;
}

export interface Unit1SubtopicDisplay {
  code: string;
  title: string;
  description: string;
  diagramLabel: string;
}

export const UNIT1_HERO_SUMMARY =
  'Analyze motion in one, two, and three dimensions using vector calculus, graphical rates of change, and inertial reference frames without invoking forces.';

export const UNIT1_SUBTOPIC_DISPLAY: Record<string, Unit1SubtopicDisplay> = {
  'sub-1-1': {
    code: '1.1',
    title: 'Scalars & Vector Algebra',
    description:
      'Decompose 3D unit vectors, build resultant sums, and compare scalar paths with displacement.',
    diagramLabel: 'Vector addition diagram showing coordinate axes, component vectors, and resultant arrow',
  },
  'sub-1-2': {
    code: '1.2',
    title: 'Displacement, Velocity & Acceleration',
    description:
      'Contrast average secant slopes with instantaneous derivatives and kinematic integrals.',
    diagramLabel: 'Position versus time curve with secant line, tangent slope, and instantaneous velocity point',
  },
  'sub-1-3': {
    code: '1.3',
    title: 'Projectile & Drag Ballistics',
    description:
      'Simulate 3D launch trajectories across vacuum, linear Stokes, and quadratic drag regimes.',
    diagramLabel: 'Projectile launch trajectory comparing ideal vacuum parabola against drag-damped arc',
  },
  'sub-1-4': {
    code: '1.4',
    title: 'Reference Frames & Relative Motion',
    description:
      'Switch inertial observers, build Galilean velocity triangles, and test acceleration invariance.',
    diagramLabel: 'Stationary and moving reference frames linked by a Galilean relative velocity triangle',
  },
  'sub-1-5': {
    code: '1.5',
    title: 'Motion in Two & Three Dimensions',
    description:
      'Separate perpendicular motion components, compare drop-vs-launch timing, and inspect 3D paths.',
    diagramLabel: 'Two-dimensional trajectory showing independent horizontal and vertical motion components',
  },
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

export function getRestingCardMetrics(rect?: RectLike): CursorCardMetrics {
  return {
    spotX: rect && rect.width > 0 ? rect.width / 2 : 0,
    spotY: rect && rect.height > 0 ? rect.height / 2 : 0,
    normX: 0,
    normY: 0,
    tiltX: 0,
    tiltY: 0,
    active: 0,
  };
}

/**
 * Pure cursor-to-card coordinate transform for spotlight glow and SVG diagram micro-parallax.
 * Returns zeroed motion values when reducedMotion is enabled or rect dimensions are non-positive.
 */
export function computeCursorCardMetrics(
  clientX: number,
  clientY: number,
  rect: RectLike,
  options?: { reducedMotion?: boolean; maxTiltDeg?: number }
): CursorCardMetrics {
  const reducedMotion = options?.reducedMotion ?? false;
  const maxTiltDeg = options?.maxTiltDeg ?? 1.4;

  if (reducedMotion || rect.width <= 0 || rect.height <= 0) {
    return getRestingCardMetrics(rect);
  }

  const localX = clamp(clientX - rect.left, 0, rect.width);
  const localY = clamp(clientY - rect.top, 0, rect.height);

  const normX = clamp((localX / rect.width) * 2 - 1, -1, 1);
  const normY = clamp((localY / rect.height) * 2 - 1, -1, 1);

  // Pitch gently toward cursor: top cursor tilts top away/back slightly for tactile glass depth
  const tiltX = Number((-normY * maxTiltDeg).toFixed(3));
  const tiltY = Number((normX * maxTiltDeg).toFixed(3));

  return {
    spotX: Number(localX.toFixed(1)),
    spotY: Number(localY.toFixed(1)),
    normX: Number(normX.toFixed(4)),
    normY: Number(normY.toFixed(4)),
    tiltX,
    tiltY,
    active: 1,
  };
}

export function getUnit1SubtopicMeta(
  subtopicId: string,
  code: string,
  fallbackTitle: string,
  fallbackDescription: string
): Unit1SubtopicDisplay {
  const override = UNIT1_SUBTOPIC_DISPLAY[subtopicId];
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
