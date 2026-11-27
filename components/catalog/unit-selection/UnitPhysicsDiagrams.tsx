'use client';

import React from 'react';
import { Unit1PhysicsDiagram } from '@/components/catalog/unit1/Unit1PhysicsDiagrams';
import { getUnitThemePalette, type UnitThemeVariant } from '@/lib/ui/unit-selection-data';

interface UnitPhysicsDiagramProps {
  subtopicId: string;
  course: UnitThemeVariant;
  label: string;
}

const layerStyle = (xScale: number, yScale: number): React.CSSProperties => ({
  transform: `translate3d(calc(var(--px, 0) * ${xScale}px), calc(var(--py, 0) * ${yScale}px), 0)`,
  transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
  willChange: 'transform',
});

/**
 * Tailored minimalist inline SVG physics diagrams for all live subtopics across
 * Units 1, 2, 8, and Unit 11 Summary. Reacts smoothly to parent CSS vars --px/--py.
 */
export const UnitPhysicsDiagram: React.FC<UnitPhysicsDiagramProps> = ({
  subtopicId,
  course,
  label,
}) => {
  if (subtopicId.startsWith('sub-1-')) {
    return <Unit1PhysicsDiagram subtopicId={subtopicId} label={label} />;
  }

  const palette = getUnitThemePalette(course);
  const primary = palette.svgPrimaryStroke;
  const highlight = palette.svgHighlightStroke;
  const secondary = palette.svgSecondaryStroke;
  const muted = palette.svgMutedStroke;
  const darkFill = course === 'mechanics' ? '#0b181d' : '#0c162b';
  const blockFill = course === 'mechanics' ? '#13252c' : '#13213c';

  const arrowPrimary = `arrow-p-${subtopicId}`;
  const arrowSecondary = `arrow-s-${subtopicId}`;
  const glowId = `glow-${subtopicId}`;

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
            id={arrowPrimary}
            viewBox="0 0 8 8"
            refX="6.4"
            refY="4"
            markerWidth="5.2"
            markerHeight="5.2"
            orient="auto-start-reverse"
          >
            <path
              d="M1 1.2L6.8 4L1 6.8"
              stroke={primary}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
          <marker
            id={arrowSecondary}
            viewBox="0 0 8 8"
            refX="6.4"
            refY="4"
            markerWidth="4.8"
            markerHeight="4.8"
            orient="auto-start-reverse"
          >
            <path
              d="M1.2 1.4L6.6 4L1.2 6.6"
              stroke={secondary}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.svgGlowColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={palette.svgGlowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 2.1 Systems & Center of Mass */}
        {subtopicId === 'sub-2-1' && (
          <>
            <g style={layerStyle(-2, -1.5)}>
              <line x1="28" y1="22" x2="66" y2="46" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="98" y1="26" x2="66" y2="46" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="108" y1="62" x2="66" y2="46" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="36" y1="70" x2="66" y2="46" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" />
            </g>
            <g style={layerStyle(3.2, 2.4)}>
              <circle cx="28" cy="22" r="7.5" fill={blockFill} stroke={primary} strokeWidth="1.5" />
              <circle cx="36" cy="70" r="8.5" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
              <circle cx="98" cy="26" r="5" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
              <circle cx="108" cy="62" r="6" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
            </g>
            <g style={layerStyle(6.4, 4.8)}>
              <circle cx="66" cy="46" r="12" fill={`url(#${glowId})`} />
              <circle cx="66" cy="46" r="4.5" fill={primary} stroke={darkFill} strokeWidth="1.4" />
              <line x1="66" y1="38" x2="66" y2="54" stroke={highlight} strokeWidth="1.1" />
              <line x1="58" y1="46" x2="74" y2="46" stroke={highlight} strokeWidth="1.1" />
              <text x="74" y="42" fill={highlight} fontSize="7.5" fontFamily="monospace">CM</text>
            </g>
          </>
        )}

        {/* 2.2 Forces & Free-Body Diagrams */}
        {subtopicId === 'sub-2-2' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              <path d="M18 74 L114 74 L114 24 Z" fill={blockFill} fillOpacity="0.45" stroke={muted} strokeWidth="1.2" />
              <path d="M36 74 A18 18 0 0 0 33.8 65.5" stroke={secondary} strokeWidth="1.1" />
              <text x="39" y="70" fill={secondary} fontSize="8" fontFamily="serif" fontStyle="italic">θ</text>
            </g>
            <g style={layerStyle(3.2, 2.4)}>
              <g transform="translate(68 48) rotate(-27.5)">
                <rect x="-13" y="-16" width="26" height="16" rx="2.5" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
              </g>
              {/* Gravity mg straight down */}
              <line x1="64" y1="41" x2="64" y2="71" stroke={secondary} strokeWidth="1.6" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
              <text x="68" y="69" fill={secondary} fontSize="8" fontFamily="serif" fontStyle="italic">mg</text>
            </g>
            <g style={layerStyle(6.4, 4.8)}>
              <circle cx="64" cy="41" r="9.5" fill={`url(#${glowId})`} />
              {/* Normal force perpendicular to ramp */}
              <line x1="64" y1="41" x2="50" y2="15" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              {/* Up-ramp tension / friction */}
              <line x1="64" y1="41" x2="90" y2="27" stroke={highlight} strokeWidth="1.6" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <circle cx="64" cy="41" r="2.8" fill={highlight} />
              <text x="37" y="20" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">Fₙ</text>
            </g>
          </>
        )}

        {/* 2.3 Newton's Third Law & Tension */}
        {subtopicId === 'sub-2-3' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              <line x1="34" y1="12" x2="98" y2="12" stroke={muted} strokeWidth="2" strokeLinecap="round" />
              <line x1="66" y1="12" x2="66" y2="27" stroke={secondary} strokeWidth="1.5" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Pulley wheel */}
              <circle cx="66" cy="27" r="10.5" fill={blockFill} stroke={secondary} strokeWidth="1.5" />
              <circle cx="66" cy="27" r="2.5" fill={primary} />
              {/* Rope lines */}
              <line x1="55.5" y1="27" x2="55.5" y2="56" stroke={secondary} strokeWidth="1.4" />
              <line x1="76.5" y1="27" x2="76.5" y2="48" stroke={secondary} strokeWidth="1.4" />
              {/* Suspended masses */}
              <rect x="46.5" y="56" width="18" height="18" rx="3" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
              <rect x="69" y="48" width="15" height="14" rx="2.5" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
            </g>
            <g style={layerStyle(6.2, 4.6)}>
              {/* Action-reaction tension arrows */}
              <line x1="41" y1="62" x2="41" y2="39" stroke={primary} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="91" y1="39" x2="91" y2="62" stroke={primary} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="31" y="52" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">T</text>
              <text x="95" y="52" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">T</text>
            </g>
          </>
        )}

        {/* 2.4 Newton's First Law & Equilibrium */}
        {subtopicId === 'sub-2-4' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              <line x1="42" y1="12" x2="90" y2="12" stroke={muted} strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="66" cy="46" r="24" stroke={muted} strokeWidth="1" strokeDasharray="2.5 3" />
            </g>
            <g style={layerStyle(3.2, 2.4)}>
              <rect x="57" y="37" width="18" height="18" rx="3" fill={blockFill} stroke={secondary} strokeWidth="1.5" />
            </g>
            <g style={layerStyle(6.4, 4.8)}>
              <circle cx="66" cy="46" r="11" fill={`url(#${glowId})`} />
              <line x1="66" y1="37" x2="66" y2="16" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="66" y1="55" x2="66" y2="76" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="57" y1="46" x2="36" y2="46" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="75" y1="46" x2="96" y2="46" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <circle cx="66" cy="46" r="2.6" fill={highlight} />
            </g>
          </>
        )}

        {/* 2.5 Newton's Second Law & Dynamics (Modified Atwood) */}
        {subtopicId === 'sub-2-5' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Table & pulley edge */}
              <line x1="14" y1="48" x2="96" y2="48" stroke={muted} strokeWidth="2" strokeLinecap="round" />
              <line x1="96" y1="48" x2="96" y2="80" stroke={muted} strokeWidth="1.4" />
              {/* Motion trails */}
              <line x1="16" y1="34" x2="28" y2="34" stroke={primary} strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="12" y1="39" x2="25" y2="39" stroke={primary} strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Cart */}
              <rect x="32" y="29" width="26" height="13" rx="3" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
              <circle cx="38" cy="45" r="3" fill={darkFill} stroke={secondary} strokeWidth="1.3" />
              <circle cx="52" cy="45" r="3" fill={darkFill} stroke={secondary} strokeWidth="1.3" />
              {/* Pulley & string */}
              <circle cx="99" cy="45" r="5.5" fill={blockFill} stroke={secondary} strokeWidth="1.3" />
              <line x1="58" y1="39.5" x2="99" y2="39.5" stroke={secondary} strokeWidth="1.3" />
              <line x1="104.5" y1="45" x2="104.5" y2="62" stroke={secondary} strokeWidth="1.3" />
              {/* Hanging block */}
              <rect x="97.5" y="62" width="14" height="14" rx="2.5" fill={blockFill} stroke={primary} strokeWidth="1.4" />
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Acceleration arrows */}
              <line x1="44" y1="20" x2="72" y2="20" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="117" y1="56" x2="117" y2="77" stroke={primary} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="56" y="16" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">a</text>
            </g>
          </>
        )}

        {/* 2.6 Gravitational Force & Shell Theorem */}
        {subtopicId === 'sub-2-6' && (
          <>
            <g style={layerStyle(-2, -1.5)}>
              <ellipse cx="66" cy="46" rx="44" ry="28" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" transform="rotate(-14 66 46)" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Primary planet / shell */}
              <circle cx="44" cy="52" r="14" fill={blockFill} stroke={secondary} strokeWidth="1.5" />
              <circle cx="44" cy="52" r="8" stroke={muted} strokeWidth="1" strokeDasharray="2 2" />
              {/* Satellite */}
              <circle cx="98" cy="34" r="6" fill={blockFill} stroke={primary} strokeWidth="1.5" />
            </g>
            <g style={layerStyle(6.4, 4.8)}>
              <circle cx="98" cy="34" r="11" fill={`url(#${glowId})`} />
              {/* Mutual gravitational attraction arrows */}
              <line x1="59" y1="47" x2="73" y2="42.4" stroke={primary} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="91" y1="36.4" x2="77" y2="41" stroke={primary} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="72" y="33" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">F_g</text>
            </g>
          </>
        )}

        {/* 2.7 Kinetic & Static Friction */}
        {subtopicId === 'sub-2-7' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Textured rough floor */}
              <line x1="12" y1="64" x2="120" y2="64" stroke={muted} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M22 64 L16 71 M36 64 L30 71 M50 64 L44 71 M64 64 L58 71 M78 64 L72 71 M92 64 L86 71 M106 64 L100 71" stroke={muted} strokeWidth="1.1" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              <rect x="48" y="38" width="34" height="25" rx="3" fill={blockFill} stroke={secondary} strokeWidth="1.5" />
              {/* Normal arrow */}
              <line x1="65" y1="38" x2="65" y2="16" stroke={secondary} strokeWidth="1.4" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
              <text x="69" y="22" fill={secondary} fontSize="8" fontFamily="serif" fontStyle="italic">Fₙ</text>
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Applied pull right */}
              <line x1="82" y1="50" x2="114" y2="50" stroke={primary} strokeWidth="1.9" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              {/* Opposing friction left along contact surface */}
              <line x1="48" y1="60" x2="19" y2="60" stroke={highlight} strokeWidth="1.9" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="100" y="45" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">F</text>
              <text x="20" y="55" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">f</text>
            </g>
          </>
        )}

        {/* 2.8 Spring Forces & Equivalent k */}
        {subtopicId === 'sub-2-8' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Fixed left wall */}
              <line x1="18" y1="20" x2="18" y2="70" stroke={muted} strokeWidth="2.2" strokeLinecap="round" />
              <path d="M18 26 L12 31 M18 38 L12 43 M18 50 L12 55 M18 62 L12 67" stroke={muted} strokeWidth="1.1" />
              {/* Equilibrium dashed vertical */}
              <line x1="78" y1="16" x2="78" y2="74" stroke={muted} strokeWidth="1.1" strokeDasharray="3 3" />
              <text x="73" y="82" fill={secondary} fontSize="7.5" fontFamily="serif" fontStyle="italic">x₀</text>
            </g>
            <g style={layerStyle(3.6, 2.2)}>
              {/* Coiled spring */}
              <path
                d="M18 46 L27 46 L31 35 L38 57 L45 35 L52 57 L59 35 L66 57 L71 46 L82 46"
                stroke={secondary}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Mass block */}
              <rect x="82" y="33" width="24" height="26" rx="3.5" fill={blockFill} stroke={primary} strokeWidth="1.6" />
              <text x="90" y="49" fill={highlight} fontSize="9" fontFamily="serif" fontStyle="italic">m</text>
            </g>
            <g style={layerStyle(6.6, 4.4)}>
              <circle cx="94" cy="46" r="10" fill={`url(#${glowId})`} />
              {/* Restoring force arrow back toward x0 */}
              <line x1="94" y1="22" x2="68" y2="22" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="74" y="16" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">Fₛ</text>
            </g>
          </>
        )}

        {/* 2.9 Resistive Forces & Terminal Velocity */}
        {subtopicId === 'sub-2-9' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Axes */}
              <line x1="18" y1="74" x2="118" y2="74" stroke={muted} strokeWidth="1.3" strokeLinecap="round" />
              <line x1="18" y1="74" x2="18" y2="12" stroke={muted} strokeWidth="1.3" strokeLinecap="round" />
              {/* Horizontal terminal velocity asymptote v_T */}
              <line x1="18" y1="24" x2="116" y2="24" stroke={primary} strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="3.5 3" />
              <text x="106" y="19" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">v_T</text>
              <text x="120" y="77" fill={secondary} fontSize="8" fontFamily="serif" fontStyle="italic">t</text>
            </g>
            <g style={layerStyle(3.2, 2.4)}>
              {/* Exponential curve v(t) = v_T(1 - e^-t/tau) */}
              <path d="M18 74 C32 42, 54 27, 114 25" stroke={primary} strokeWidth="2.1" strokeLinecap="round" />
              {/* Time constant vertical tick */}
              <line x1="44" y1="42" x2="44" y2="74" stroke={muted} strokeWidth="1.1" strokeDasharray="2.5 2.5" />
              <text x="41" y="83" fill={secondary} fontSize="8" fontFamily="serif" fontStyle="italic">τ</text>
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              <circle cx="76" cy="28" r="10" fill={`url(#${glowId})`} />
              <circle cx="76" cy="28" r="3.4" fill={highlight} stroke={darkFill} strokeWidth="1.3" />
            </g>
          </>
        )}

        {/* 2.10 Circular Motion & Orbits */}
        {subtopicId === 'sub-2-10' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              <circle cx="64" cy="46" r="30" stroke={muted} strokeWidth="1.4" strokeDasharray="3.5 3" />
              <circle cx="64" cy="46" r="3" fill={secondary} />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Radius line */}
              <line x1="64" y1="46" x2="88" y2="28" stroke={muted} strokeWidth="1.1" strokeDasharray="2 2" />
              <text x="77" y="42" fill={secondary} fontSize="8" fontFamily="serif" fontStyle="italic">r</text>
            </g>
            <g style={layerStyle(6.6, 4.8)}>
              <circle cx="88" cy="28" r="10.5" fill={`url(#${glowId})`} />
              {/* Centripetal acceleration inward */}
              <line x1="88" y1="28" x2="70" y2="41.5" stroke={primary} strokeWidth="1.9" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              {/* Tangential velocity */}
              <line x1="88" y1="28" x2="105" y2="50" stroke={highlight} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <circle cx="88" cy="28" r="3.6" fill={highlight} stroke={darkFill} strokeWidth="1.3" />
              <text x="106" y="47" fill={highlight} fontSize="8.5" fontFamily="serif" fontStyle="italic">v</text>
              <text x="54" y="34" fill={primary} fontSize="8" fontFamily="serif" fontStyle="italic">a_c</text>
            </g>
          </>
        )}

        {/* 8.1 Electric Charge & Coulomb Force */}
        {subtopicId === 'sub-8-1' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              <line x1="34" y1="46" x2="98" y2="46" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" />
              <text x="64" y="61" fill={secondary} fontSize="8.5" fontFamily="serif" fontStyle="italic">r</text>
            </g>
            <g style={layerStyle(3.2, 2.4)}>
              {/* Positive charge q1 */}
              <circle cx="34" cy="46" r="11" fill={blockFill} stroke={primary} strokeWidth="1.6" />
              <path d="M30 46 H38 M34 42 V50" stroke={highlight} strokeWidth="1.6" strokeLinecap="round" />
              {/* Negative charge q2 */}
              <circle cx="98" cy="46" r="11" fill={blockFill} stroke={secondary} strokeWidth="1.6" />
              <path d="M94 46 H102" stroke={secondary} strokeWidth="1.6" strokeLinecap="round" />
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              <circle cx="34" cy="46" r="14" fill={`url(#${glowId})`} />
              {/* Attractive Coulomb force vectors */}
              <line x1="47" y1="46" x2="61" y2="46" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="85" y1="46" x2="71" y2="46" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="58" y="35" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">F_E</text>
            </g>
          </>
        )}

        {/* 8.2 Conservation of Charge & Charging */}
        {subtopicId === 'sub-8-2' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Ground symbol under right sphere */}
              <line x1="94" y1="62" x2="94" y2="73" stroke={muted} strokeWidth="1.3" />
              <line x1="85" y1="73" x2="103" y2="73" stroke={muted} strokeWidth="1.4" strokeLinecap="round" />
              <line x1="88.5" y1="77" x2="99.5" y2="77" stroke={muted} strokeWidth="1.3" strokeLinecap="round" />
              <line x1="92" y1="81" x2="96" y2="81" stroke={muted} strokeWidth="1.2" strokeLinecap="round" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              <circle cx="38" cy="44" r="16" fill={blockFill} stroke={secondary} strokeWidth="1.4" />
              <circle cx="94" cy="44" r="16" fill={blockFill} stroke={primary} strokeWidth="1.5" />
              {/* Polarized signs */}
              <text x="33.5" y="47.5" fill={secondary} fontSize="11" fontFamily="monospace">−</text>
              <text x="86" y="47.5" fill={highlight} fontSize="10" fontFamily="monospace">+</text>
              <text x="97" y="47.5" fill={secondary} fontSize="10" fontFamily="monospace">−</text>
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Electron transfer arc */}
              <path d="M44 25 Q 66 10 86 24" stroke={primary} strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <circle cx="65" cy="18" r="8" fill={`url(#${glowId})`} />
              <text x="61" y="14" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">e⁻</text>
            </g>
          </>
        )}

        {/* 8.3 Electric Fields & Lorentz Dynamics */}
        {subtopicId === 'sub-8-3' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Dipole field arcs */}
              <path d="M30 46 C44 16, 88 16, 102 46" stroke={muted} strokeWidth="1.2" />
              <path d="M30 46 C44 76, 88 76, 102 46" stroke={muted} strokeWidth="1.2" />
              <path d="M30 46 C50 30, 82 30, 102 46" stroke={primary} strokeOpacity="0.65" strokeWidth="1.35" />
              <path d="M30 46 C50 62, 82 62, 102 46" stroke={primary} strokeOpacity="0.65" strokeWidth="1.35" />
              <line x1="30" y1="46" x2="102" y2="46" stroke={muted} strokeWidth="1.1" strokeDasharray="3 3" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              <circle cx="28" cy="46" r="7.5" fill={blockFill} stroke={primary} strokeWidth="1.5" />
              <path d="M25 46 H31 M28 43 V49" stroke={highlight} strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="104" cy="46" r="7.5" fill={blockFill} stroke={secondary} strokeWidth="1.5" />
              <path d="M101 46 H107" stroke={secondary} strokeWidth="1.3" strokeLinecap="round" />
            </g>
            <g style={layerStyle(6.6, 4.8)}>
              {/* Glowing test charge + tangent E vector */}
              <circle cx="66" cy="34" r="10.5" fill={`url(#${glowId})`} />
              <line x1="66" y1="34" x2="84" y2="34" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <circle cx="66" cy="34" r="3.4" fill={highlight} stroke={darkFill} strokeWidth="1.2" />
              <text x="74" y="29" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">E</text>
            </g>
          </>
        )}

        {/* 8.4 Electric Fields of Charge Distributions */}
        {subtopicId === 'sub-8-4' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Central axis */}
              <line x1="16" y1="46" x2="116" y2="46" stroke={muted} strokeWidth="1.2" strokeDasharray="3 3" />
              {/* Differential rays from top & bottom of ring */}
              <line x1="36" y1="18" x2="88" y2="46" stroke={muted} strokeWidth="1.1" strokeDasharray="2.5 2.5" />
              <line x1="36" y1="74" x2="88" y2="46" stroke={muted} strokeWidth="1.1" strokeDasharray="2.5 2.5" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Charged ring seen in perspective */}
              <ellipse cx="36" cy="46" rx="10" ry="28" fill={blockFill} fillOpacity="0.4" stroke={secondary} strokeWidth="1.8" />
              {/* Highlighted dq element */}
              <circle cx="36" cy="18" r="3.5" fill={primary} />
              <text x="20" y="16" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">dq</text>
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Resultant axial electric field E at point P */}
              <circle cx="88" cy="46" r="10" fill={`url(#${glowId})`} />
              <line x1="88" y1="46" x2="114" y2="46" stroke={primary} strokeWidth="2" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="88" y1="46" x2="104" y2="55" stroke={secondary} strokeWidth="1.2" strokeDasharray="2 2" />
              <line x1="88" y1="46" x2="104" y2="37" stroke={secondary} strokeWidth="1.2" strokeDasharray="2 2" />
              <circle cx="88" cy="46" r="3" fill={highlight} />
              <text x="106" y="40" fill={highlight} fontSize="8.5" fontFamily="serif" fontStyle="italic">E</text>
            </g>
          </>
        )}

        {/* 8.5 Electric Flux & Surface Integrals */}
        {subtopicId === 'sub-8-5' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Parallel E field lines entering left */}
              <line x1="12" y1="30" x2="48" y2="30" stroke={muted} strokeWidth="1.3" />
              <line x1="12" y1="46" x2="54" y2="46" stroke={muted} strokeWidth="1.3" />
              <line x1="12" y1="62" x2="44" y2="62" stroke={muted} strokeWidth="1.3" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Tilted translucent area patch */}
              <polygon
                points="48,18 82,28 72,72 38,62"
                fill={primary}
                fillOpacity="0.14"
                stroke={primary}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              {/* Emerging field arrows */}
              <line x1="68" y1="30" x2="112" y2="30" stroke={secondary} strokeWidth="1.4" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
              <line x1="64" y1="46" x2="114" y2="46" stroke={secondary} strokeWidth="1.4" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
              <line x1="60" y1="62" x2="108" y2="62" stroke={secondary} strokeWidth="1.4" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Outward normal vector dA */}
              <circle cx="60" cy="45" r="9.5" fill={`url(#${glowId})`} />
              <line x1="60" y1="45" x2="96" y2="27" stroke={primary} strokeWidth="2" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <circle cx="60" cy="45" r="2.8" fill={highlight} />
              <text x="95" y="23" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">dA</text>
            </g>
          </>
        )}

        {/* 8.6 Gauss's Law & Symmetry */}
        {subtopicId === 'sub-8-6' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Dashed spherical Gaussian surface */}
              <circle cx="66" cy="44" r="29" fill={primary} fillOpacity="0.06" stroke={primary} strokeWidth="1.5" strokeDasharray="4 3" />
              <ellipse cx="66" cy="44" rx="29" ry="9" stroke={primary} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Radial E arrows piercing Gaussian sphere */}
              <line x1="66" y1="24" x2="66" y2="8" stroke={primary} strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="66" y1="64" x2="66" y2="80" stroke={primary} strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="46" y1="44" x2="28" y2="44" stroke={primary} strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="86" y1="44" x2="104" y2="44" stroke={primary} strokeWidth="1.5" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <line x1="80" y1="30" x2="92" y2="18" stroke={secondary} strokeWidth="1.3" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
              <line x1="52" y1="58" x2="40" y2="70" stroke={secondary} strokeWidth="1.3" strokeLinecap="round" markerEnd={`url(#${arrowSecondary})`} />
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Enclosed central charge Q_enc */}
              <circle cx="66" cy="44" r="12" fill={`url(#${glowId})`} />
              <circle cx="66" cy="44" r="7" fill={blockFill} stroke={highlight} strokeWidth="1.6" />
              <path d="M63 44 H69 M66 41 V47" stroke={highlight} strokeWidth="1.4" strokeLinecap="round" />
            </g>
          </>
        )}

        {/* Unit 11 Summary: 3D Circuit Workbench & MNA Solver */}
        {subtopicId === 'sub-11-summary' && (
          <>
            <g style={layerStyle(-2, -1.4)}>
              {/* Outer closed loop wire */}
              <path d="M24 38 V20 H108 V68 H24 V50" stroke={muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              {/* Parallel branch */}
              <line x1="68" y1="20" x2="68" y2="68" stroke={muted} strokeWidth="1.4" />
            </g>
            <g style={layerStyle(3.2, 2.2)}>
              {/* Battery symbol on left */}
              <line x1="16" y1="38" x2="32" y2="38" stroke={primary} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="20" y1="45" x2="28" y2="45" stroke={secondary} strokeWidth="1.8" strokeLinecap="round" />
              {/* Top resistor zigzag */}
              <path d="M40 20 L44 14 L50 26 L56 14 L62 20" stroke={secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              {/* Right resistor zigzag */}
              <path d="M108 32 L114 36 L102 42 L114 48 L108 52" stroke={secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              {/* Center capacitor plates */}
              <line x1="60" y1="41" x2="76" y2="41" stroke={primary} strokeWidth="1.8" strokeLinecap="round" />
              <line x1="60" y1="47" x2="76" y2="47" stroke={primary} strokeWidth="1.8" strokeLinecap="round" />
            </g>
            <g style={layerStyle(6.4, 4.6)}>
              {/* Junction node + live current arrow */}
              <circle cx="68" cy="20" r="9.5" fill={`url(#${glowId})`} />
              <circle cx="68" cy="20" r="3.2" fill={highlight} stroke={darkFill} strokeWidth="1.2" />
              <line x1="76" y1="20" x2="96" y2="20" stroke={primary} strokeWidth="1.8" strokeLinecap="round" markerEnd={`url(#${arrowPrimary})`} />
              <text x="84" y="14" fill={highlight} fontSize="8" fontFamily="serif" fontStyle="italic">I</text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
};
