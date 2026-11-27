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

  // Simulation 1.2: Displacement, Velocity, and Acceleration
  'sim-kinematics12': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>v</Vec><Sub>avg</Sub> <Op>=</Op> <Frac num={<><Var>Δ</Var><Vec>r</Vec></>} den={<><Var>Δ</Var><Var>t</Var></>} />
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>v</Vec> <Op>=</Op> <Frac num={<><Var>d</Var><Vec>r</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>a</Vec> <Op>=</Op> <Frac num={<><Var>d</Var><Vec>v</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />
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

  // Simulation 1.4: Reference Frames and Relative Motion
  'sim-relative14': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>v</Vec><Sub>P/E</Sub> <Op>=</Op> <Vec>v</Vec><Sub>P/M</Sub> <Op>+</Op> <Vec>v</Vec><Sub>M/E</Sub>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>a</Vec><Sub>P/E</Sub> <Op>=</Op> <Vec>a</Vec><Sub>P/M</Sub>
      </span>
    </span>
  ),

  // Simulation 1.5: Motion in Two or Three Dimensions
  'sim-motion15': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>r</Vec>(<Var>t</Var>) <Op>=</Op> <Var>x</Var>(<Var>t</Var>)<Var>î</Var> <Op>+</Op> <Var>y</Var>(<Var>t</Var>)<Var>ĵ</Var>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Vec>a</Vec> <Op>=</Op> <Frac num={<><Var>d</Var><Vec>v</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />
      </span>
    </span>
  ),

  // Simulation 2.1: Systems and Center of Mass
  'sim-systems21': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>x</Vec><Sub>cm</Sub> <Op>=</Op> <Frac num={<><BigSum /> <Var>m</Var><Sub>i</Sub><Vec>x</Vec><Sub>i</Sub></>} den={<><BigSum /> <Var>m</Var><Sub>i</Sub></>} />
      </span>
    </span>
  ),

  'sim-systems21-int': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>r</Vec><Sub>cm</Sub> <Op>=</Op> <Frac num={<><BigInt /> <Vec>r</Vec> <Var>d</Var><Var>m</Var></>} den={<><BigInt /> <Var>d</Var><Var>m</Var></>} />
      </span>
    </span>
  ),

  'sim-systems21-lambda': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>λ</Var> <Op>=</Op> <Frac num={<><Var>d</Var></>} den={<><Var>d</Var><Var>ℓ</Var></>} /><Var>m</Var>(<Var>ℓ</Var>)
      </span>
    </span>
  ),

  'sim-systems21-mass': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>M</Var><Sub>total</Sub> <Op>=</Op> <BigInt /> <Var>ρ</Var>(<Var>r</Var>) <Var>d</Var><Var>V</Var>
      </span>
    </span>
  ),

  // Simulation 2.2: Forces and Free-Body Diagrams
  'sim-forces22': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Vec>F</Vec><Sub>ext</Sub> <Op>=</Op> <Var>m</Var><Vec>a</Vec>
      </span>
    </span>
  ),

  'sim-forces22-incline': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Vec>F</Vec><Sub>ext</Sub> <Op>=</Op> <Var>m</Var><Vec>a</Vec>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>F</Var><Sub>N</Sub> <Op>=</Op> <Var>m</Var><Var>g</Var><span className="font-serif not-italic ml-0.5">cos</span><Var>θ</Var>
      </span>
    </span>
  ),

  // Simulation 2.3: Newton's Third Law
  'sim-newton23': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec><Sub>A on B</Sub> <Op>=</Op> <Op>−</Op><Vec>F</Vec><Sub>B on A</Sub>
      </span>
    </span>
  ),

  'sim-newton23-full': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec><Sub>A on B</Sub> <Op>=</Op> <Op>−</Op><Vec>F</Vec><Sub>B on A</Sub>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <BigSum /> <Vec>F</Vec><Sub>int</Sub> <Op>=</Op> 0
      </span>
    </span>
  ),

  // Simulation 2.4: Newton's First Law
  'sim-newton24': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Vec>F</Vec><Sub>i</Sub> <Op>=</Op> 0
      </span>
    </span>
  ),

  'sim-newton24-full': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /> <Vec>F</Vec><Sub>i</Sub> <Op>=</Op> 0
      </span>
      <span className="text-slate-500 font-sans mx-1">⇒</span>
      <span>
        <Vec>v</Vec> <Op>=</Op> <span className="font-serif not-italic">const</span>
      </span>
    </span>
  ),

  // Simulation 2.5: Newton's Second Law
  'sim-newton25': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>a</Vec><Sub>sys</Sub> <Op>=</Op>{' '}
        <Frac
          num={
            <>
              <BigSum /> <Vec>F</Vec>
            </>
          }
          den={
            <>
              <Var>m</Var><Sub>sys</Sub>
            </>
          }
        />
      </span>
    </span>
  ),

  'sim-newton25-full': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>a</Vec><Sub>sys</Sub> <Op>=</Op>{' '}
        <Frac
          num={
            <>
              <BigSum /> <Vec>F</Vec>
            </>
          }
          den={
            <>
              <Var>m</Var><Sub>sys</Sub>
            </>
          }
        />{' '}
        <Op>=</Op>{' '}
        <Frac
          num={
            <>
              <Vec>F</Vec><Sub>net</Sub>
            </>
          }
          den={
            <>
              <Var>m</Var><Sub>sys</Sub>
            </>
          }
        />
      </span>
    </span>
  ),

  // Simulation 2.6: Gravitational Force & Shell Theorem
  'sim-gravity26': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        |<Vec>F</Vec><Sub>g</Sub>| <Op>=</Op> <Var>G</Var>
        <Frac
          num={
            <>
              <Var>m</Var><Sub>1</Sub><Var>m</Var><Sub>2</Sub>
            </>
          }
          den={
            <>
              <Var>r</Var><Sup>2</Sup>
            </>
          }
        />
      </span>
    </span>
  ),

  'sim-gravity26-field': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        |<Vec>g</Vec>| <Op>=</Op>{' '}
        <Frac
          num={
            <>
              |<Vec>F</Vec><Sub>g</Sub>|
            </>
          }
          den={<Var>m</Var>}
        />{' '}
        <Op>=</Op> <Var>G</Var>
        <Frac
          num={<Var>M</Var>}
          den={
            <>
              <Var>r</Var><Sup>2</Sup>
            </>
          }
        />
      </span>
    </span>
  ),

  'sim-gravity26-shell': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec><Sub>g,partial</Sub> <Op>=</Op> <Op>−</Op><Var>k</Var><Vec>r</Vec><Sub>partial</Sub>
      </span>
    </span>
  ),

  // Simulation 2.7: Kinetic and Static Friction
  'sim-friction27': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        |<Vec>F</Vec><Sub>f,s</Sub>| <Op>≤</Op> |<Var>μ</Var><Sub>s</Sub><Vec>F</Vec><Sub>N</Sub>|
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        |<Vec>F</Vec><Sub>f,k</Sub>| <Op>=</Op> |<Var>μ</Var><Sub>k</Sub><Vec>F</Vec><Sub>N</Sub>|
      </span>
    </span>
  ),

  'sim-friction27-kinetic': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        |<Vec>F</Vec><Sub>f,k</Sub>| <Op>=</Op> |<Var>μ</Var><Sub>k</Sub><Vec>F</Vec><Sub>N</Sub>|
      </span>
    </span>
  ),

  'sim-friction27-static': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        |<Vec>F</Vec><Sub>f,s</Sub>| <Op>≤</Op> |<Var>μ</Var><Sub>s</Sub><Vec>F</Vec><Sub>N</Sub>|
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>F</Var><Sub>f,s,max</Sub> <Op>=</Op> <Var>μ</Var><Sub>s</Sub><Var>F</Var><Sub>N</Sub>
      </span>
    </span>
  ),

  // Simulation 2.8: Spring Forces
  'sim-springs28': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec><Sub>s</Sub> <Op>=</Op> <Op>−</Op><Var>k</Var><Op>Δ</Op><Vec>x</Vec>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>k</Var><Sub>eq,par</Sub> <Op>=</Op> <BigSum /><Var>k</Var><Sub>i</Sub>
      </span>
    </span>
  ),

  'sim-springs28-hooke': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec><Sub>s</Sub> <Op>=</Op> <Op>−</Op><Var>k</Var><Op>Δ</Op><Vec>x</Vec>
      </span>
    </span>
  ),

  'sim-springs28-series': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Frac num={<span>1</span>} den={<span><Var>k</Var><Sub>eq,ser</Sub></span>} /> <Op>=</Op>{' '}
        <BigSum /><Frac num={<span>1</span>} den={<span><Var>k</Var><Sub>i</Sub></span>} />
      </span>
    </span>
  ),

  'sim-springs28-parallel': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>k</Var><Sub>eq,par</Sub> <Op>=</Op> <BigSum /><Var>k</Var><Sub>i</Sub>
      </span>
    </span>
  ),

  // Simulation 2.9: Resistive Forces
  'sim-resistive29': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>F</Vec><Sub>r</Sub> <Op>=</Op> <Op>−</Op><Var>k</Var><Vec>v</Vec>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>v</Var><Sub>T</Sub> <Op>=</Op> <Frac num={<><Var>m</Var><Var>g</Var></>} den={<Var>k</Var>} />
      </span>
    </span>
  ),

  'sim-resistive29-ode': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>m</Var><Frac num={<><Var>d</Var><Var>v</Var></>} den={<><Var>d</Var><Var>t</Var></>} /> <Op>=</Op> <Var>m</Var><Var>g</Var> <Op>−</Op> <Var>k</Var><Var>v</Var>
      </span>
    </span>
  ),

  'sim-resistive29-exp': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>v</Var>(<Var>t</Var>) <Op>=</Op> <Var>v</Var><Sub>T</Sub> <Op>+</Op> (<Var>v</Var><Sub>0</Sub> <Op>−</Op> <Var>v</Var><Sub>T</Sub>)<Var>e</Var><Sup>−kt/m</Sup>
      </span>
    </span>
  ),

  'sim-resistive29-vt': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>v</Var><Sub>T</Sub> <Op>=</Op> <Frac num={<><Var>F</Var><Sub>drive</Sub></>} den={<Var>k</Var>} />
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>τ</Var> <Op>=</Op> <Frac num={<Var>m</Var>} den={<Var>k</Var>} />
      </span>
    </span>
  ),

  // Simulation 2.10: Circular Motion & Kepler's Third Law
  'sim-circular210': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>a</Var><Sub>c</Sub> <Op>=</Op> <Frac num={<><Var>v</Var><Sup>2</Sup></>} den={<Var>r</Var>} />
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>T</Var><Sup>2</Sup> <Op>=</Op> <Frac num={<>4<Var>π</Var><Sup>2</Sup></>} den={<><Var>G</Var><Var>M</Var></>} /><Var>R</Var><Sup>3</Sup>
      </span>
    </span>
  ),

  'sim-circular210-ac': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>a</Var><Sub>c</Sub> <Op>=</Op> <Frac num={<><Var>v</Var><Sup>2</Sup></>} den={<Var>r</Var>} />
      </span>
    </span>
  ),

  'sim-circular210-vmin': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>v</Var><Sub>min</Sub> <Op>=</Op> <span className="inline-flex items-center"><span className="font-sans mr-[1px]">√</span><span className="border-t border-current px-0.5 leading-tight"><Var>g</Var><Var>r</Var></span></span>
      </span>
    </span>
  ),

  'sim-circular210-period': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>T</Var> <Op>=</Op> <Frac num="1" den={<Var>f</Var>} /> <Op>=</Op> <Frac num={<>2<Var>π</Var><Var>r</Var></>} den={<Var>v</Var>} />
      </span>
    </span>
  ),

  'sim-circular210-kepler': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>T</Var><Sup>2</Sup> <Op>=</Op> <Frac num={<>4<Var>π</Var><Sup>2</Sup></>} den={<><Var>G</Var><Var>M</Var></>} /><Var>R</Var><Sup>3</Sup>
      </span>
    </span>
  ),

  // Simulation 3.1: Translational Kinetic Energy
  'sim-kinetic31': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>K</Var> <Op>=</Op> <Frac num="1" den="2" /><Var>m</Var><Var>v</Var><Sup>2</Sup>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>K</Var><Sub>obs</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>m</Var>|<Vec>v</Vec><Sub>rel</Sub>|<Sup>2</Sup>
      </span>
    </span>
  ),

  'sim-kinetic31-eq': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>K</Var> <Op>=</Op> <Frac num="1" den="2" /><Var>m</Var><Var>v</Var><Sup>2</Sup>
      </span>
    </span>
  ),

  'sim-kinetic31-components': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>K</Var> <Op>=</Op> <Frac num="1" den="2" /><Var>m</Var>(<Var>v</Var><Sub>x</Sub><Sup>2</Sup> <Op>+</Op> <Var>v</Var><Sub>y</Sub><Sup>2</Sup>)
      </span>
    </span>
  ),

  'sim-kinetic31-frame': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>K</Var><Sub>P/O</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>m</Var>(<Var>v</Var><Sub>P/E</Sub> <Op>−</Op> <Var>v</Var><Sub>O/E</Sub>)<Sup>2</Sup>
      </span>
    </span>
  ),

  // Simulation 8.2: Conservation of Electric Charge & Process of Charging
  'sim-charging82': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigSum /><Var>Q</Var><Sub>i</Sub> <Op>=</Op> <BigSum /><Var>Q</Var><Sub>f</Sub>
      </span>
      <span className="text-slate-500 font-sans mx-1">,</span>
      <span>
        <Var>Q</Var> <Op>=</Op> (<Var>N</Var><Sub>p</Sub> <Op>−</Op> <Var>N</Var><Sub>e</Sub>)<Var>e</Var>
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

  // Simulation 8.4: Electric Fields of Charge Distributions
  'sim-distributions84': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Vec>E</Vec> <Op>=</Op> <Frac num="1" den={<>4<Var>π</Var><Var>ε</Var><Sub>0</Sub></>} />{' '}
        <BigInt /> <Frac num={<><Var>d</Var><Var>q</Var></>} den={<><Var>r</Var><Sup>2</Sup></>} />{' '}
        <Var>r̂</Var>
      </span>
    </span>
  ),

  // Simulation 8.5: Electric Flux (Surface Integral & Constant-Field Dot Product)
  'sim-flux85': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>Φ</Var><Sub>E</Sub> <Op>=</Op> <BigInt /> <Vec>E</Vec> <Dot /> <Var>d</Var><Vec>A</Vec>
      </span>
    </span>
  ),

  'sim-flux85-dot': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>Φ</Var><Sub>E</Sub> <Op>=</Op> <Vec>E</Vec> <Dot /> <Vec>A</Vec>
      </span>
    </span>
  ),

  // Simulation 8.6: Gauss's Law & Charge Density Volume Integral
  'sim-gauss86': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <BigContourInt /> <Vec>E</Vec> <Dot /> <Var>d</Var><Vec>A</Vec> <Op>=</Op> <Frac num={<><Var>q</Var><Sub>enc</Sub></>} den={<><Var>ε</Var><Sub>0</Sub></>} />
      </span>
    </span>
  ),

  'sim-gauss86-rho': (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 font-serif text-[1.05em]">
      <span>
        <Var>Q</Var><Sub>total</Sub> <Op>=</Op> <BigInt /> <Var>ρ</Var>(<Vec>r</Vec>) <Var>d</Var><Var>V</Var>
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
  // Exact compound textbook formulas before splitting on ' · '
  if (text.includes('v_P/E') && text.includes('v_M/E')) {
    return AP_MATH_FORMULAS['sim-relative14'];
  }
  if (text.includes('î') && text.includes('ĵ') && text.includes('r(t)')) {
    return AP_MATH_FORMULAS['sim-motion15'];
  }
  if (text.includes('v_avg') && text.includes('dr/dt')) {
    return AP_MATH_FORMULAS['sim-kinematics12'];
  }
  if (text.includes('∑ Q_i = ∑ Q_f') || text.includes('ΣQ_i = ΣQ_f')) {
    return AP_MATH_FORMULAS['sim-charging82'];
  }
  if (text.includes('dq / r²') || text.includes('dq/r²')) {
    return AP_MATH_FORMULAS['sim-distributions84'];
  }
  if (text.includes('q_enc / ε₀')) {
    return AP_MATH_FORMULAS['sim-gauss86'];
  }
  if (text.includes('∮ E · dA')) {
    return AP_MATH_FORMULAS['unit-8'];
  }
  if (text.includes('∫ E · dA') || (text.includes('Φ_E') && text.includes('dA'))) {
    return AP_MATH_FORMULAS['sim-flux85'];
  }
  if (text.includes('Φ_E') && text.includes('E · A')) {
    return AP_MATH_FORMULAS['sim-flux85-dot'];
  }
  if (text.includes('v(t) = dr/dt') && text.includes('a(t) = dv/dt')) {
    return AP_MATH_FORMULAS['unit-1'];
  }
  if (text.includes('F_ext') && text.includes('cosθ')) {
    return AP_MATH_FORMULAS['sim-forces22-incline'];
  }
  if (text.includes('F_A on B') && text.includes('F_int')) {
    return AP_MATH_FORMULAS['sim-newton23-full'];
  }
  if (text.includes('F_A on B')) {
    return AP_MATH_FORMULAS['sim-newton23'];
  }
  if ((text.includes('∑ F_i = 0') || text.includes('ΣF_i = 0')) && text.includes('const')) {
    return AP_MATH_FORMULAS['sim-newton24-full'];
  }
  if (text.includes('∑ F_i = 0') || text.includes('ΣF_i = 0')) {
    return AP_MATH_FORMULAS['sim-newton24'];
  }
  if (text.includes('a_sys =') && text.includes('F_net')) {
    return AP_MATH_FORMULAS['sim-newton25-full'];
  }
  if (text.includes('a_sys =') && text.includes('m_sys')) {
    return AP_MATH_FORMULAS['sim-newton25'];
  }
  if (text.includes('G m_1 m_2 / r²') || text.includes('G m₁ m₂ / r²')) {
    return AP_MATH_FORMULAS['sim-gravity26'];
  }
  if (text.includes('g = G M / r²') || text.includes('|g| = G M / r²')) {
    return AP_MATH_FORMULAS['sim-gravity26-field'];
  }
  if (text.includes('F_g,partial')) {
    return AP_MATH_FORMULAS['sim-gravity26-shell'];
  }
  if (text.includes('μ_s F_N') && text.includes('μ_k F_N')) {
    return AP_MATH_FORMULAS['sim-friction27'];
  }
  if (text.includes('F_f,k') || text.includes('μ_k F_N')) {
    return AP_MATH_FORMULAS['sim-friction27-kinetic'];
  }
  if (text.includes('F_f,s') || text.includes('μ_s F_N')) {
    return AP_MATH_FORMULAS['sim-friction27-static'];
  }
  if (text.includes('F_s = -k Δx') && text.includes('k_eq')) {
    return AP_MATH_FORMULAS['sim-springs28'];
  }
  if (text.includes('F_s = -k Δx') || text.includes('F_s = -kΔx')) {
    return AP_MATH_FORMULAS['sim-springs28-hooke'];
  }
  if (text.includes('1/k_eq') || text.includes('k_eq,ser')) {
    return AP_MATH_FORMULAS['sim-springs28-series'];
  }
  if (text.includes('k_eq,par')) {
    return AP_MATH_FORMULAS['sim-springs28-parallel'];
  }
  if (text.includes('F_r = -k v') || text.includes('F_r = -kv')) {
    return AP_MATH_FORMULAS['sim-resistive29'];
  }
  if (text.includes('m dv/dt = mg - kv')) {
    return AP_MATH_FORMULAS['sim-resistive29-ode'];
  }
  if (text.includes('a_c = v²/r') && text.includes('T² =')) {
    return AP_MATH_FORMULAS['sim-circular210'];
  }
  if (text.includes('4π² / GM') || text.includes('4π²/(GM)')) {
    return AP_MATH_FORMULAS['sim-circular210-kepler'];
  }
  if (text.includes('a_c = v²/r') || text.includes('a_c = v² / r')) {
    return AP_MATH_FORMULAS['sim-circular210-ac'];
  }
  if (text.includes('K = ½ m v²') && text.includes('v_rel')) {
    return AP_MATH_FORMULAS['sim-kinetic31'];
  }
  if (text.includes('K = ½ m v²') || text.includes('K = 1/2 m v²')) {
    return AP_MATH_FORMULAS['sim-kinetic31-eq'];
  }

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
  // Topic 2.1: Discrete & Continuous Center of Mass
  if (text.includes('x_cm') && text.includes('m_i')) {
    return AP_MATH_FORMULAS['sim-systems21'];
  }
  if (text.includes('r_cm') && text.includes('dm')) {
    return AP_MATH_FORMULAS['sim-systems21-int'];
  }
  // Topic 2.2: Forces and Free-Body Diagrams
  if (text.includes('F_ext')) {
    return AP_MATH_FORMULAS['sim-forces22'];
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
