'use client';

import React from 'react';

interface Unit1PhysicsDiagramProps {
  subtopicId: string;
  label: string;
}

const layerStyle = (xScale: number, yScale: number): React.CSSProperties => ({
  transform: `translate3d(calc(var(--px, 0) * ${xScale}px), calc(var(--py, 0) * ${yScale}px), 0)`,
  transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
  willChange: 'transform',
});

/**
 * Tailored minimalist inline SVG physics diagrams for Unit 1: Kinematics (1.1–1.5).
 * Consumes CSS custom properties --px and --py (in [-1, 1]) provided by the parent
 * Unit1SpotlightCard so secondary geometry and focal particles smoothly track the cursor.
 */
export const Unit1PhysicsDiagram: React.FC<Unit1PhysicsDiagramProps> = ({ subtopicId, label }) => {
  return (
    <div
      className="relative w-[114px] sm:w-[130px] h-[78px] sm:h-[86px] shrink-0 flex items-center justify-center select-none pointer-events-none transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 132 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
        className="w-full h-full overflow-visible"
      >
        <defs>
          <marker
            id={`arrow-teal-${subtopicId}`}
            viewBox="0 0 8 8"
            refX="6.5"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M1 1.2L6.8 4L1 6.8" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker
            id={`arrow-slate-${subtopicId}`}
            viewBox="0 0 8 8"
            refX="6.5"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M1.2 1.4L6.6 4L1.2 6.6" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <radialGradient id={`glow-${subtopicId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1.1 Scalars & Vectors: 2D/3D coordinate axes + vector A, B & resultant C */}
        {subtopicId === 'sub-1-1' && (
          <>
            <g style={layerStyle(-2, -1.5)}>
              <line x1="24" y1="70" x2="114" y2="70" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="24" y1="70" x2="24" y2="12" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="24" y1="70" x2="8" y2="80" stroke="#334155" strokeWidth="1.1" strokeDasharray="2.5 2.5" strokeLinecap="round" />
              <text x="116" y="73" fill="#64748b" fontSize="8.5" fontFamily="serif" fontStyle="italic">x</text>
              <text x="15" y="14" fill="#64748b" fontSize="8.5" fontFamily="serif" fontStyle="italic">y</text>
            </g>

            <g style={layerStyle(3.2, 2.4)}>
              {/* Dashed parallelogram completion */}
              <line x1="82" y1="54" x2="106" y2="20" stroke="#475569" strokeWidth="1.1" strokeDasharray="3 3" />
              <line x1="48" y1="36" x2="106" y2="20" stroke="#475569" strokeWidth="1.1" strokeDasharray="3 3" />
              {/* Component vectors A & B */}
              <line x1="24" y1="70" x2="80" y2="54.5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" markerEnd={`url(#arrow-slate-${subtopicId})`} />
              <line x1="24" y1="70" x2="47" y2="38" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" markerEnd={`url(#arrow-slate-${subtopicId})`} />
              <text x="64" y="67" fill="#94a3b8" fontSize="8.5" fontFamily="serif" fontStyle="italic">A</text>
              <text x="29" y="42" fill="#94a3b8" fontSize="8.5" fontFamily="serif" fontStyle="italic">B</text>
            </g>

            <g style={layerStyle(6.2, 4.8)}>
              <circle cx="106" cy="20" r="10" fill={`url(#glow-${subtopicId})`} />
              {/* Resultant vector R */}
              <line x1="24" y1="70" x2="103" y2="22" stroke="#2dd4bf" strokeWidth="2.1" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              {/* Unit vector tick near origin */}
              <line x1="24" y1="70" x2="42" y2="59" stroke="#99f6e4" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="24" cy="70" r="2.6" fill="#e2e8f0" />
              <text x="108" y="16" fill="#5eead4" fontSize="9.5" fontFamily="serif" fontStyle="italic">r</text>
            </g>
          </>
        )}

        {/* 1.2 Displacement, Velocity & Acceleration: x(t) curve + secant vs tangent slope */}
        {subtopicId === 'sub-1-2' && (
          <>
            <g style={layerStyle(-2, -1.5)}>
              <line x1="16" y1="74" x2="120" y2="74" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="16" y1="74" x2="16" y2="10" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              {/* Subtle integral shading beneath curve */}
              <path d="M22 68 C46 66, 62 46, 86 28 C98 19, 108 16, 114 14 L114 74 L22 74 Z" fill="#2dd4bf" fillOpacity="0.06" />
              <text x="122" y="77" fill="#64748b" fontSize="8.5" fontFamily="serif" fontStyle="italic">t</text>
              <text x="7" y="14" fill="#64748b" fontSize="8.5" fontFamily="serif" fontStyle="italic">x</text>
            </g>

            <g style={layerStyle(3.2, 2.4)}>
              {/* Position curve x(t) */}
              <path d="M22 68 C46 66, 62 46, 86 28 C98 19, 108 16, 114 14" stroke="#94a3b8" strokeWidth="1.9" strokeLinecap="round" />
              {/* Dashed secant chord */}
              <line x1="38" y1="62" x2="102" y2="19" stroke="#64748b" strokeWidth="1.15" strokeDasharray="3 3" />
              <circle cx="38" cy="62" r="2.2" fill="#94a3b8" />
              <circle cx="102" cy="19" r="2.2" fill="#94a3b8" />
            </g>

            <g style={layerStyle(6.4, 4.6)}>
              {/* Crisp teal tangent line at midpoint */}
              <line x1="42" y1="67" x2="98" y2="19" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" />
              {/* Right triangle Δx / Δt hint */}
              <path d="M68 45 L88 45 L88 28" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="68" cy="45" r="10.5" fill={`url(#glow-${subtopicId})`} />
              <circle cx="68" cy="45" r="3.4" fill="#2dd4bf" stroke="#0b1523" strokeWidth="1.3" />
              <text x="92" y="42" fill="#5eead4" fontSize="8.5" fontFamily="serif" fontStyle="italic">v</text>
            </g>
          </>
        )}

        {/* 1.3 Projectile & Drag Ballistics: vacuum parabola vs drag-damped asymmetric arc */}
        {subtopicId === 'sub-1-3' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Ground baseline */}
              <line x1="10" y1="74" x2="122" y2="74" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
              {/* Ideal vacuum parabola (dashed) */}
              <path d="M18 74 Q 68 -4 118 74" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3.2 3" />
            </g>

            <g style={layerStyle(3.4, 2.4)}>
              {/* Drag-damped trajectory arc (solid teal) */}
              <path d="M18 74 C 34 26, 66 20, 82 36 C 92 46, 97 60, 100 74" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
              {/* Launch velocity arrow */}
              <line x1="18" y1="74" x2="34" y2="44" stroke="#5eead4" strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              {/* Angle arc */}
              <path d="M31 74 A 13 13 0 0 0 24.5 62.8" stroke="#94a3b8" strokeWidth="1.1" />
              <text x="34" y="70" fill="#94a3b8" fontSize="8" fontFamily="serif" fontStyle="italic">θ</text>
            </g>

            <g style={layerStyle(6.8, 4.8)}>
              {/* Projectile sphere near apex with velocity & drag opposing arrow */}
              <circle cx="65" cy="27" r="10.5" fill={`url(#glow-${subtopicId})`} />
              <line x1="65" y1="27" x2="81" y2="29" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              <line x1="65" y1="27" x2="52" y2="25.5" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" markerEnd={`url(#arrow-slate-${subtopicId})`} />
              <circle cx="65" cy="27" r="3.6" fill="#5eead4" stroke="#091321" strokeWidth="1.3" />
              {/* Impact marker */}
              <circle cx="100" cy="74" r="2.2" fill="#2dd4bf" />
            </g>
          </>
        )}

        {/* 1.4 Reference Frames & Relative Motion: Earth frame E, moving platform M, Galilean triangle */}
        {subtopicId === 'sub-1-4' && (
          <>
            <g style={layerStyle(-2.2, -1.4)}>
              {/* Earth frame E baseline */}
              <line x1="12" y1="75" x2="120" y2="75" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="18" y1="75" x2="18" y2="18" stroke="#334155" strokeWidth="1.1" strokeDasharray="2.5 2.5" />
              <text x="11" y="83" fill="#64748b" fontSize="8" fontFamily="monospace">E</text>
            </g>

            <g style={layerStyle(3.5, 2)}>
              {/* Moving platform M */}
              <rect x="34" y="57" width="54" height="10" rx="3" fill="#132236" stroke="#64748b" strokeWidth="1.2" />
              <circle cx="44" cy="70.5" r="3" fill="#0d1828" stroke="#64748b" strokeWidth="1.2" />
              <circle cx="78" cy="70.5" r="3" fill="#0d1828" stroke="#64748b" strokeWidth="1.2" />
              {/* Platform motion arrow v_M/E */}
              <line x1="92" y1="62" x2="115" y2="62" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#arrow-slate-${subtopicId})`} />
              <text x="58" y="64.5" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">M</text>
            </g>

            <g style={layerStyle(6.8, 4.8)}>
              {/* Galilean velocity vector triangle above platform */}
              {/* v_M/E horizontal leg */}
              <line x1="34" y1="44" x2="72" y2="44" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#arrow-slate-${subtopicId})`} />
              {/* v_P/M vertical/angled leg */}
              <line x1="74" y1="44" x2="96" y2="19" stroke="#5eead4" strokeWidth="1.6" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              {/* Resultant v_P/E diagonal */}
              <line x1="34" y1="44" x2="94" y2="19" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              <circle cx="96" cy="18" r="9.5" fill={`url(#glow-${subtopicId})`} />
              <circle cx="96" cy="18" r="3.2" fill="#5eead4" stroke="#0b1523" strokeWidth="1.2" />
              <text x="103" y="20" fill="#5eead4" fontSize="8.5" fontFamily="serif" fontStyle="italic">P</text>
            </g>
          </>
        )}

        {/* 1.5 Motion in Two & Three Dimensions: 2D curved path with independent x & y projections */}
        {subtopicId === 'sub-1-5' && (
          <>
            <g style={layerStyle(-2, -1.5)}>
              <line x1="18" y1="74" x2="118" y2="74" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="18" y1="74" x2="18" y2="10" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              {/* Horizontal alignment lines showing y(t) independence */}
              <line x1="18" y1="22" x2="54" y2="22" stroke="#334155" strokeWidth="1" strokeDasharray="2.5 2.5" />
              <line x1="18" y1="44" x2="82" y2="44" stroke="#334155" strokeWidth="1" strokeDasharray="2.5 2.5" />
              {/* Vertical drop ghosts on y-axis */}
              <circle cx="18" cy="22" r="2.2" fill="#64748b" />
              <circle cx="18" cy="44" r="2.2" fill="#64748b" />
              <text x="120" y="77" fill="#64748b" fontSize="8.5" fontFamily="serif" fontStyle="italic">x</text>
              <text x="9" y="14" fill="#64748b" fontSize="8.5" fontFamily="serif" fontStyle="italic">y</text>
            </g>

            <g style={layerStyle(3.2, 2.4)}>
              {/* 2D launched trajectory */}
              <path d="M18 16 Q 76 18 106 74" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="54" cy="22" r="2.3" fill="#94a3b8" />
              {/* Projection dashed drop to x-axis */}
              <line x1="82" y1="44" x2="82" y2="74" stroke="#475569" strokeWidth="1" strokeDasharray="2.5 2.5" />
              <circle cx="82" cy="74" r="2.1" fill="#2dd4bf" />
            </g>

            <g style={layerStyle(6.6, 4.8)}>
              {/* Active particle + perpendicular vx & vy component arrows */}
              <circle cx="82" cy="44" r="10.5" fill={`url(#glow-${subtopicId})`} />
              <line x1="82" y1="44" x2="108" y2="44" stroke="#2dd4bf" strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              <line x1="82" y1="44" x2="82" y2="66" stroke="#2dd4bf" strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#arrow-teal-${subtopicId})`} />
              <line x1="82" y1="44" x2="104" y2="62" stroke="#99f6e4" strokeWidth="1.35" strokeDasharray="2.2 2" />
              <circle cx="82" cy="44" r="3.4" fill="#5eead4" stroke="#091321" strokeWidth="1.3" />
              <text x="108" y="40" fill="#5eead4" fontSize="7.8" fontFamily="serif" fontStyle="italic">vₓ</text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
};
