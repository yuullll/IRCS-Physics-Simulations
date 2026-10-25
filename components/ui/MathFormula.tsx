'use client';

import React from 'react';

/**
 * Mathematical Typography Helpers for authentic textbook/handwritten notation:
 * - Italic serif variables
 * - True vector arrows overhead
 * - Stacked vertical fractions
 * - Proper mathematical operators (dot, cross, sum, integral, contour integral)
 * - Subscripts, superscripts, Greek symbols
 */

export const Var: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <span className={`font-serif italic font-normal tracking-tight ${className}`}>{children}</span>;

export const Vec: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <span className={`relative inline-block mx-0.5 align-baseline ${className}`}>
    <span
      aria-hidden="true"
      className="absolute -top-[0.52em] left-0 right-0 text-center text-[0.6em] font-sans font-medium leading-none select-none pointer-events-none opacity-90"
    >
      →
    </span>
    <span className="font-serif italic font-normal tracking-tight inline-block leading-normal">{children}</span>
  </span>
);

export const Frac: React.FC<{
  num: React.ReactNode;
  den: React.ReactNode;
  className?: string;
}> = ({ num, den, className = '' }) => (
  <span className={`inline-flex flex-col items-center justify-center align-middle mx-1 text-[0.88em] leading-tight ${className}`}>
    <span className="border-b border-current px-1 pb-[1px] w-full text-center">{num}</span>
    <span className="px-1 pt-[1px] w-full text-center">{den}</span>
  </span>
);

export const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <sub className="text-[0.72em] font-serif not-italic ml-[1px] align-baseline relative -bottom-[0.25em]">
    {children}
  </sub>
);

export const Sup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <sup className="text-[0.72em] font-serif not-italic ml-[1px] align-baseline relative -top-[0.45em]">
    {children}
  </sup>
);

export const Dot: React.FC = () => (
  <span className="mx-1 text-[0.85em] font-bold select-none text-current opacity-80">·</span>
);

export const Cross: React.FC = () => (
  <span className="mx-1 text-[0.85em] font-bold select-none text-current opacity-80">×</span>
);

export const Op: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="mx-1 font-sans font-normal text-current opacity-90 select-none">{children}</span>
);

export const BigSum: React.FC<{ sub?: React.ReactNode; sup?: React.ReactNode }> = ({ sub, sup }) => (
  <span className="inline-flex flex-col items-center justify-center align-middle mx-1 text-base leading-none">
    {sup && <span className="text-[0.65em] font-sans font-normal">{sup}</span>}
    <span className="text-lg font-serif not-italic leading-none">∑</span>
    {sub && <span className="text-[0.65em] font-sans font-normal">{sub}</span>}
  </span>
);

export const BigInt: React.FC<{ sub?: React.ReactNode; sup?: React.ReactNode }> = ({ sub, sup }) => (
  <span className="inline-flex items-center align-middle mx-0.5">
    <span className="text-xl font-serif not-italic leading-none">∫</span>
    {(sub || sup) && (
      <span className="inline-flex flex-col text-[0.68em] leading-none ml-[1px] -translate-y-0.5">
        <span>{sup}</span>
        <span>{sub}</span>
      </span>
    )}
  </span>
);

export const BigContourInt: React.FC = () => (
  <span className="inline-flex items-center align-middle mx-0.5 text-xl font-serif not-italic leading-none">
    ∮
  </span>
);

/**
 * Standard High-Fidelity Mathematical Handwritten / Textbook Formulations for AP Physics C Units
 */
export const AP_MATH_FORMULAS: Record<string, React.ReactNode> = {
  // Unit 1: Kinematics
  'unit-1': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>v</Vec>(<Var>t</Var>) <Op>=</Op> <Frac num={<><Var>d</Var><Vec>r</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>a</Vec>(<Var>t</Var>) <Op>=</Op> <Frac num={<><Var>d</Var><Vec>v</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />
      </span>
    </span>
  ),

  // Unit 2: Force & Translational Dynamics
  'unit-2': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Vec>F</Vec> <Op>=</Op> <Frac num={<><Var>d</Var><Vec>p</Vec></>} den={<><Var>d</Var><Var>t</Var></>} /> <Op>=</Op> <Var>m</Var><Vec>a</Vec>
      </span>
    </span>
  ),

  // Unit 3: Work, Energy, and Power
  'unit-3': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>W</Var> <Op>=</Op> <BigInt /> <Vec>F</Vec> <Dot /> <Var>d</Var><Vec>r</Vec> <Op>=</Op> <Var>Δ</Var><Var>K</Var>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>F</Var><Sub>x</Sub> <Op>=</Op> <Op>−</Op><Frac num={<><Var>d</Var><Var>U</Var></>} den={<><Var>d</Var><Var>x</Var></>} />
      </span>
    </span>
  ),

  // Unit 4: Linear Momentum
  'unit-4': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>J</Vec> <Op>=</Op> <BigInt /> <Vec>F</Vec>(<Var>t</Var>)<Var>d</Var><Var>t</Var> <Op>=</Op> <Var>Δ</Var><Vec>p</Vec>
      </span>
    </span>
  ),

  // Unit 5: Torque and Rotational Dynamics
  'unit-5': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Vec>τ</Vec> <Op>=</Op> <Var>I</Var><Vec>α</Vec>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>τ</Vec> <Op>=</Op> <Vec>r</Vec> <Cross /> <Vec>F</Vec>
      </span>
    </span>
  ),

  // Unit 6: Energy and Momentum of Rotating Systems
  'unit-6': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>L</Vec> <Op>=</Op> <Vec>r</Vec> <Cross /> <Vec>p</Vec> <Op>=</Op> <Var>I</Var><Vec>ω</Vec>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>K</Var><Sub>rot</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>I</Var><Var>ω</Var><Sup>2</Sup>
      </span>
    </span>
  ),

  // Unit 7: Oscillations
  'unit-7': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Frac num={<><Var>d</Var><Sup>2</Sup><Var>x</Var></>} den={<><Var>d</Var><Var>t</Var><Sup>2</Sup></>} /> <Op>+</Op> <Var>ω</Var><Sub>0</Sub><Sup>2</Sup><Var>x</Var> <Op>=</Op> 0
      </span>
    </span>
  ),

  // Unit 8: Electric Charges, Fields, and Gauss's Law
  'unit-8': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigContourInt /> <Vec>E</Vec> <Dot /> <Var>d</Var><Vec>A</Vec> <Op>=</Op> <Frac num={<><Var>Q</Var><Sub>enc</Sub></>} den={<><Var>ε</Var><Sub>0</Sub></>} />
      </span>
    </span>
  ),

  // Unit 9: Electric Potential
  'unit-9': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>Δ</Var><Var>V</Var> <Op>=</Op> <Op>−</Op><BigInt /> <Vec>E</Vec> <Dot /> <Var>d</Var><Vec>r</Vec>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>E</Vec> <Op>=</Op> <Op>−</Op><Vec>∇</Vec><Var>V</Var>
      </span>
    </span>
  ),

  // Unit 10: Conductors and Capacitors
  'unit-10': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>Q</Var> <Op>=</Op> <Var>C</Var><Var>Δ</Var><Var>V</Var>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>U</Var><Sub>C</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>C</Var>(<Var>Δ</Var><Var>V</Var>)<Sup>2</Sup>
      </span>
    </span>
  ),

  // Unit 11: Electric Circuits
  'unit-11': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Var>I</Var><Sub>in</Sub> <Op>=</Op> <BigSum /> <Var>I</Var><Sub>out</Sub>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <BigSum /> <Var>Δ</Var><Var>V</Var> <Op>=</Op> 0
      </span>
    </span>
  ),

  // Unit 12: Magnetic Fields and Electromagnetism
  'unit-12': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigContourInt /> <Vec>B</Vec> <Dot /> <Var>d</Var><Vec>ℓ</Vec> <Op>=</Op> <Var>μ</Var><Sub>0</Sub><Var>I</Var><Sub>enc</Sub>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>F</Vec><Sub>B</Sub> <Op>=</Op> <Var>q</Var>(<Vec>v</Vec> <Cross /> <Vec>B</Vec>)
      </span>
    </span>
  ),

  // Unit 13: Electromagnetic Induction
  'unit-13': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>ℰ</Var> <Op>=</Op> <Op>−</Op><Frac num={<><Var>d</Var><Var>Φ</Var><Sub>B</Sub></>} den={<><Var>d</Var><Var>t</Var></>} /> <Op>=</Op> <BigContourInt /> <Vec>E</Vec> <Dot /> <Var>d</Var><Vec>ℓ</Vec>
      </span>
    </span>
  ),

  // Simulation 1.3: Non-Linear Projectile & Drag Ballistics
  'sim-projectile': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>m</Var><Frac num={<><Var>d</Var><Vec>v</Vec></>} den={<><Var>d</Var><Var>t</Var></>} /> <Op>=</Op> <Var>m</Var><Vec>g</Vec> <Op>−</Op> <Var>b</Var><Vec>v</Vec> <Op>−</Op> <Var>c</Var>|<Vec>v</Vec>|<Vec>v</Vec>
      </span>
    </span>
  ),

  // Simulation 8.3: Electrostatic Field & Lorentz Dynamics
  'sim-field': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec> <Op>=</Op> <Var>q</Var>(<Vec>E</Vec> <Op>+</Op> <Vec>v</Vec> <Cross /> <Vec>B</Vec>)
      </span>
    </span>
  ),

  // Simulation 11.S: 3D Circuit Workbench
  'sim-circuit': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Var>I</Var><Sub>in</Sub> <Op>=</Op> <BigSum /> <Var>I</Var><Sub>out</Sub>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <BigSum /> <Var>Δ</Var><Var>V</Var> <Op>=</Op> 0
      </span>
    </span>
  ),

  // 5 AP Kinematic Equations for Auditor
  'kinematics-1': (
    <span className="inline-flex items-center flex-wrap gap-x-1 font-serif text-[1.1em]">
      <Var>v</Var><Sub>x</Sub> <Op>=</Op> <Var>v</Var><Sub>x0</Sub> <Op>+</Op> <Var>a</Var><Sub>x</Sub><Var>t</Var>
    </span>
  ),

  'kinematics-2': (
    <span className="inline-flex items-center flex-wrap gap-x-1 font-serif text-[1.1em]">
      <Var>x</Var> <Op>=</Op> <Var>x</Var><Sub>0</Sub> <Op>+</Op> <Var>v</Var><Sub>x0</Sub><Var>t</Var> <Op>+</Op> <Frac num="1" den="2" /><Var>a</Var><Sub>x</Sub><Var>t</Var><Sup>2</Sup>
    </span>
  ),

  'kinematics-3': (
    <span className="inline-flex items-center flex-wrap gap-x-1 font-serif text-[1.1em]">
      <Var>v</Var><Sub>x</Sub><Sup>2</Sup> <Op>=</Op> <Var>v</Var><Sub>x0</Sub><Sup>2</Sup> <Op>+</Op> 2<Var>a</Var><Sub>x</Sub>(<Var>x</Var> <Op>−</Op> <Var>x</Var><Sub>0</Sub>)
    </span>
  ),

  'kinematics-4': (
    <span className="inline-flex items-center flex-wrap gap-x-1 font-serif text-[1.1em]">
      <Var>Δ</Var><Var>x</Var> <Op>=</Op> <BigInt /> <Var>v</Var><Sub>x</Sub>(<Var>t</Var>)<Var>d</Var><Var>t</Var>
    </span>
  ),

  'kinematics-5': (
    <span className="inline-flex items-center flex-wrap gap-x-1 font-serif text-[1.1em]">
      <Var>Δ</Var><Var>v</Var><Sub>x</Sub> <Op>=</Op> <BigInt /> <Var>a</Var><Sub>x</Sub>(<Var>t</Var>)<Var>d</Var><Var>t</Var>
    </span>
  ),
};

/**
 * Universal Math Formula Renderer Component
 */
export const MathFormula: React.FC<{
  formulaKey?: string;
  rawLatex?: string;
  fallbackText?: string;
  className?: string;
}> = ({ formulaKey, rawLatex, fallbackText, className = '' }) => {
  if (formulaKey && AP_MATH_FORMULAS[formulaKey]) {
    return <span className={`inline-flex items-center ${className}`}>{AP_MATH_FORMULAS[formulaKey]}</span>;
  }

  // Check if rawLatex or fallbackText maps directly to known kinematic equations
  if (rawLatex) {
    if (rawLatex.includes('v_{x0} + a_x t')) return <span className={`inline-flex items-center ${className}`}>{AP_MATH_FORMULAS['kinematics-1']}</span>;
    if (rawLatex.includes('\\frac{1}{2}') || rawLatex.includes('0.5') || rawLatex.includes('½')) {
      return <span className={`inline-flex items-center ${className}`}>{AP_MATH_FORMULAS['kinematics-2']}</span>;
    }
    if (rawLatex.includes('v_{x0}^2 + 2') || rawLatex.includes('(x - x_0)')) {
      return <span className={`inline-flex items-center ${className}`}>{AP_MATH_FORMULAS['kinematics-3']}</span>;
    }
    if (rawLatex.includes('\\int v_x') || rawLatex.includes('∫ v_x')) {
      return <span className={`inline-flex items-center ${className}`}>{AP_MATH_FORMULAS['kinematics-4']}</span>;
    }
    if (rawLatex.includes('\\int a_x') || rawLatex.includes('∫ a_x')) {
      return <span className={`inline-flex items-center ${className}`}>{AP_MATH_FORMULAS['kinematics-5']}</span>;
    }
  }

  // Parse common mathematical expressions into handwritten notation
  if (fallbackText) {
    // Try to format fallback strings with formatted math elements
    const formatted = parseSimpleMathStringToJSX(fallbackText);
    return <span className={`inline-flex items-center font-serif ${className}`}>{formatted}</span>;
  }

  return <span className={`font-serif italic ${className}`}>{fallbackText || rawLatex || ''}</span>;
};

/**
 * Converts keyboard/computer notation strings into standard math typography
 */
function parseSimpleMathStringToJSX(text: string): React.ReactNode {
  // If text has multiple sub-equations separated by ' · ' or ','
  if (text.includes(' · ')) {
    const parts = text.split(' · ');
    return (
      <span className="inline-flex items-center flex-wrap gap-x-2">
        {parts.map((p, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-slate-500 font-sans">, </span>}
            {parseSimpleMathStringToJSX(p)}
          </React.Fragment>
        ))}
      </span>
    );
  }

  // Unit 8: ∮ E · dA = Q_enc / ε₀
  if (text.includes('∮ E · dA')) {
    return AP_MATH_FORMULAS['unit-8'];
  }
  // Unit 1: v(t) = dr/dt · a(t) = dv/dt
  if (text.includes('dr/dt')) {
    return AP_MATH_FORMULAS['unit-1'];
  }
  // Unit 2: ∑ F = dp/dt = m a
  if (text.includes('dp/dt')) {
    return AP_MATH_FORMULAS['unit-2'];
  }
  // Unit 3: W = ∫ F · dr = ΔK · F(x) = -dU/dx
  if (text.includes('dU/dx') || text.includes('∫ F · dr')) {
    return AP_MATH_FORMULAS['unit-3'];
  }
  // Unit 4: J = ∫ F(t) dt = Δp
  if (text.includes('J = ∫ F(t) dt')) {
    return AP_MATH_FORMULAS['unit-4'];
  }
  // Unit 5: ∑ τ = I α · τ = r × F
  if (text.includes('∑ τ = I α') || text.includes('r × F')) {
    return AP_MATH_FORMULAS['unit-5'];
  }
  // Unit 6: L = I ω = r × p · K_rot = ½ I ω²
  if (text.includes('K_rot') || text.includes('L = I ω')) {
    return AP_MATH_FORMULAS['unit-6'];
  }
  // Unit 7: d²x/dt² + ω₀² x = 0
  if (text.includes('d²x/dt²')) {
    return AP_MATH_FORMULAS['unit-7'];
  }
  // Unit 9: ΔV = -∫ E · dr · E = -∇V
  if (text.includes('∇V')) {
    return AP_MATH_FORMULAS['unit-9'];
  }
  // Unit 10: Q = C ΔV · U_C = ½ C (ΔV)²
  if (text.includes('U_C') || text.includes('Q = C ΔV')) {
    return AP_MATH_FORMULAS['unit-10'];
  }
  // Unit 11: ∑ I_in = ∑ I_out · ∑ ΔV = 0
  if (text.includes('I_in') || text.includes('∑ ΔV = 0')) {
    return AP_MATH_FORMULAS['unit-11'];
  }
  // Unit 12: ∮ B · dl = μ₀ I_enc · F_B = q v × B
  if (text.includes('μ₀ I_enc') || text.includes('F_B = q v × B')) {
    return AP_MATH_FORMULAS['unit-12'];
  }
  // Unit 13: ℰ = -dΦ_B / dt = ∮ E · dl
  if (text.includes('dΦ_B / dt') || text.includes('ℰ')) {
    return AP_MATH_FORMULAS['unit-13'];
  }
  // Projectile drag: m dv/dt = m g - b v - c |v| v
  if (text.includes('m g - b v')) {
    return AP_MATH_FORMULAS['sim-projectile'];
  }
  // Field Lorentz: F = q(E + v × B)
  if (text.includes('q(E + v × B)')) {
    return AP_MATH_FORMULAS['sim-field'];
  }

  // Fallback formatting for arbitrary strings
  return (
    <span className="font-serif italic tracking-wide">
      {text.replace(/·/g, ' · ').replace(/\*/g, ' · ').replace(/_/g, ' ')}
    </span>
  );
}

export default MathFormula;
