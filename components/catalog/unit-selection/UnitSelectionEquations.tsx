'use client';

import React from 'react';
import {
  BigContourInt,
  BigInt,
  BigSum,
  Cross,
  Dot,
  Frac,
  MathFormula,
  Op,
  Sub,
  Sup,
  Var,
  Vec,
} from '@/components/ui/MathFormula';
import {
  Unit1HeroLawFormula,
  Unit1SubtopicEquation,
} from '@/components/catalog/unit1/Unit1Equations';
import type { UnitThemeVariant } from '@/lib/ui/unit-selection-data';

const UnitHat: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block mx-[1px] align-baseline">
    <span
      aria-hidden="true"
      className="absolute -top-[0.3em] left-0 right-0 text-center text-[0.62em] font-sans font-semibold leading-none select-none pointer-events-none opacity-95"
    >
      ^
    </span>
    <span className="font-serif italic font-normal tracking-tight inline-block leading-normal">
      {children}
    </span>
  </span>
);

const TightOp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="mx-[2.5px] font-sans font-normal text-current opacity-90 select-none">
    {children}
  </span>
);

export const UnitHeroLawFormula: React.FC<{
  unitId: string;
  fallbackEquation: string;
}> = ({ unitId, fallbackEquation }) => {
  const wrap = (content: React.ReactNode) => (
    <span className="inline-flex items-center flex-wrap gap-x-2.5 font-serif text-[1.06rem] sm:text-[1.12rem] text-slate-100 leading-none">
      {content}
    </span>
  );

  switch (unitId) {
    case 'unit-1-kinematics':
      return <Unit1HeroLawFormula />;

    case 'unit-2-dynamics':
      return wrap(
        <span className="inline-flex items-center">
          <BigSum /> <Vec>F</Vec> <Op>=</Op>{' '}
          <Frac
            num={
              <>
                <Var>d</Var>
                <Vec>p</Vec>
              </>
            }
            den={
              <>
                <Var>d</Var>
                <Var>t</Var>
              </>
            }
          />{' '}
          <Op>=</Op> <Var>m</Var>
          <Vec>a</Vec>
        </span>
      );

    case 'unit-3-work-energy':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <Var>W</Var> <Op>=</Op> <BigInt /> <Vec>F</Vec> <Dot /> <Var>d</Var>
            <Vec>r</Vec> <Op>=</Op> <Var>Δ</Var>
            <Var>K</Var>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <Var>F</Var>
            <Sub>x</Sub> <Op>=</Op> <Op>−</Op>
            <Frac
              num={
                <>
                  <Var>d</Var>
                  <Var>U</Var>
                </>
              }
              den={
                <>
                  <Var>d</Var>
                  <Var>x</Var>
                </>
              }
            />
          </span>
        </>
      );

    case 'unit-4-momentum':
      return wrap(
        <span className="inline-flex items-center">
          <Vec>J</Vec> <Op>=</Op> <BigInt /> <Vec>F</Vec>(<Var>t</Var>)<Var>d</Var>
          <Var>t</Var> <Op>=</Op> <Var>Δ</Var>
          <Vec>p</Vec>
        </span>
      );

    case 'unit-5-rotation':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <BigSum /> <Vec>τ</Vec> <Op>=</Op> <Var>I</Var>
            <Vec>α</Vec>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <Vec>τ</Vec> <Op>=</Op> <Vec>r</Vec> <Cross /> <Vec>F</Vec>
          </span>
        </>
      );

    case 'unit-6-rotating-energy':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <Vec>L</Vec> <Op>=</Op> <Vec>r</Vec> <Cross /> <Vec>p</Vec> <Op>=</Op> <Var>I</Var>
            <Vec>ω</Vec>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <Var>K</Var>
            <Sub>rot</Sub> <Op>=</Op> <Frac num="1" den="2" />
            <Var>I</Var>
            <Var>ω</Var>
            <Sup>2</Sup>
          </span>
        </>
      );

    case 'unit-7-oscillations':
      return wrap(
        <span className="inline-flex items-center">
          <Frac
            num={
              <>
                <Var>d</Var>
                <Sup>2</Sup>
                <Var>x</Var>
              </>
            }
            den={
              <>
                <Var>d</Var>
                <Var>t</Var>
                <Sup>2</Sup>
              </>
            }
          />{' '}
          <Op>+</Op> <Var>ω</Var>
          <Sub>0</Sub>
          <Sup>2</Sup>
          <Var>x</Var> <Op>=</Op> 0
        </span>
      );

    case 'unit-8-electrostatics':
      return wrap(
        <span className="inline-flex items-center">
          <BigContourInt /> <Vec>E</Vec> <Dot /> <Var>d</Var>
          <Vec>A</Vec> <Op>=</Op>{' '}
          <Frac
            num={
              <>
                <Var>Q</Var>
                <Sub>enc</Sub>
              </>
            }
            den={
              <>
                <Var>ε</Var>
                <Sub>0</Sub>
              </>
            }
          />
        </span>
      );

    case 'unit-9-potential':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <Var>Δ</Var>
            <Var>V</Var> <Op>=</Op> <Op>−</Op>
            <BigInt /> <Vec>E</Vec> <Dot /> <Var>d</Var>
            <Vec>r</Vec>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <Vec>E</Vec> <Op>=</Op> <Op>−</Op>
            <Vec>∇</Vec>
            <Var>V</Var>
          </span>
        </>
      );

    case 'unit-10-capacitors':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <Var>Q</Var> <Op>=</Op> <Var>C</Var>
            <Var>Δ</Var>
            <Var>V</Var>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <Var>U</Var>
            <Sub>C</Sub> <Op>=</Op> <Frac num="1" den="2" />
            <Var>C</Var>(<Var>Δ</Var>
            <Var>V</Var>)<Sup>2</Sup>
          </span>
        </>
      );

    case 'unit-11-circuits':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <BigSum /> <Var>I</Var>
            <Sub>in</Sub> <Op>=</Op> <BigSum /> <Var>I</Var>
            <Sub>out</Sub>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <BigSum /> <Var>Δ</Var>
            <Var>V</Var> <Op>=</Op> 0
          </span>
        </>
      );

    case 'unit-12-magnetism':
      return wrap(
        <>
          <span className="inline-flex items-center">
            <BigContourInt /> <Vec>B</Vec> <Dot /> <Var>d</Var>
            <Vec>ℓ</Vec> <Op>=</Op> <Var>μ</Var>
            <Sub>0</Sub>
            <Var>I</Var>
            <Sub>enc</Sub>
          </span>
          <span className="text-slate-500 font-sans select-none">,</span>
          <span className="inline-flex items-center">
            <Vec>F</Vec>
            <Sub>B</Sub> <Op>=</Op> <Var>q</Var>(<Vec>v</Vec> <Cross /> <Vec>B</Vec>)
          </span>
        </>
      );

    case 'unit-13-induction':
      return wrap(
        <span className="inline-flex items-center">
          <Var>ℰ</Var> <Op>=</Op> <Op>−</Op>
          <Frac
            num={
              <>
                <Var>d</Var>
                <Var>Φ</Var>
                <Sub>B</Sub>
              </>
            }
            den={
              <>
                <Var>d</Var>
                <Var>t</Var>
              </>
            }
          />{' '}
          <Op>=</Op> <BigContourInt /> <Vec>E</Vec> <Dot /> <Var>d</Var>
          <Vec>ℓ</Vec>
        </span>
      );

    default:
      return wrap(<MathFormula rawLatex={fallbackEquation} fallbackText={fallbackEquation} />);
  }
};

export const UnitSubtopicEquation: React.FC<{
  subtopicId: string;
  course: UnitThemeVariant;
  fallbackEquation: string;
}> = ({ subtopicId, course, fallbackEquation }) => {
  const secondaryTone = course === 'mechanics' ? 'text-emerald-200/85' : 'text-sky-200/85';

  if (subtopicId.startsWith('sub-1-')) {
    return <Unit1SubtopicEquation subtopicId={subtopicId} />;
  }

  switch (subtopicId) {
    // ── Unit 2: Force & Translational Dynamics ──────────────────────────
    case 'sub-2-1':
      return (
        <div className="flex flex-col items-center gap-1 font-serif text-[0.9rem] text-slate-100 leading-tight">
          <div className="whitespace-nowrap">
            <Var>x</Var>
            <Sub>cm</Sub> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  ∑ <Var>m</Var>
                  <Sub>i</Sub>
                  <Var>x</Var>
                  <Sub>i</Sub>
                </>
              }
              den={
                <>
                  ∑ <Var>m</Var>
                  <Sub>i</Sub>
                </>
              }
            />
          </div>
          <div className={`text-[0.78rem] ${secondaryTone} whitespace-nowrap`}>
            <Vec>r</Vec>
            <Sub>cm</Sub> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  ∫ <Vec>r</Vec> <Var>dm</Var>
                </>
              }
              den={
                <>
                  ∫ <Var>dm</Var>
                </>
              }
            />
          </div>
        </div>
      );

    case 'sub-2-2':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.92rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <BigSum /> <Vec>F</Vec>
            <Sub>ext</Sub> <TightOp>=</TightOp> <Var>m</Var>
            <Vec>a</Vec>
          </div>
          <div className={`text-[0.8rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>F</Var>
            <Sub>N</Sub> <TightOp>=</TightOp> <Var>mg</Var> cos<Var>θ</Var>
          </div>
        </div>
      );

    case 'sub-2-3':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.9rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Vec>F</Vec>
            <Sub>A on B</Sub> <TightOp>=</TightOp> <TightOp>−</TightOp>
            <Vec>F</Vec>
            <Sub>B on A</Sub>
          </div>
          <div className={`text-[0.8rem] ${secondaryTone} whitespace-nowrap`}>
            <BigSum /> <Vec>F</Vec>
            <Sub>int</Sub> <TightOp>=</TightOp> 0
          </div>
        </div>
      );

    case 'sub-2-4':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.94rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <BigSum /> <Vec>F</Vec>
            <Sub>i</Sub> <TightOp>=</TightOp> 0
          </div>
          <div className={`text-[0.82rem] ${secondaryTone} whitespace-nowrap`}>
            <Vec>v</Vec> <TightOp>=</TightOp> <span className="font-sans not-italic text-[0.9em]">const</span>
          </div>
        </div>
      );

    case 'sub-2-5':
      return (
        <div className="flex items-center justify-center font-serif text-[0.98rem] text-slate-100 leading-none">
          <span className="whitespace-nowrap">
            <Vec>a</Vec>
            <Sub>sys</Sub> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  ∑ <Vec>F</Vec>
                  <Sub>ext</Sub>
                </>
              }
              den={
                <>
                  <Var>m</Var>
                  <Sub>sys</Sub>
                </>
              }
            />
          </span>
        </div>
      );

    case 'sub-2-6':
      return (
        <div className="flex flex-col items-center gap-1 font-serif text-[0.92rem] text-slate-100 leading-tight">
          <div className="whitespace-nowrap">
            <Var>F</Var>
            <Sub>g</Sub> <TightOp>=</TightOp> <Var>G</Var>
            <Frac
              num={
                <>
                  <Var>m</Var>
                  <Sub>1</Sub>
                  <Var>m</Var>
                  <Sub>2</Sub>
                </>
              }
              den={
                <>
                  <Var>r</Var>
                  <Sup>2</Sup>
                </>
              }
            />
          </div>
          <div className={`text-[0.8rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>g</Var> <TightOp>=</TightOp> <Var>G</Var>
            <Frac
              num={<Var>M</Var>}
              den={
                <>
                  <Var>r</Var>
                  <Sup>2</Sup>
                </>
              }
            />
          </div>
        </div>
      );

    case 'sub-2-7':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.91rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Var>F</Var>
            <Sub>f,s</Sub> <TightOp>≤</TightOp> <Var>μ</Var>
            <Sub>s</Sub>
            <Var>F</Var>
            <Sub>N</Sub>
          </div>
          <div className={`text-[0.82rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>F</Var>
            <Sub>f,k</Sub> <TightOp>=</TightOp> <Var>μ</Var>
            <Sub>k</Sub>
            <Var>F</Var>
            <Sub>N</Sub>
          </div>
        </div>
      );

    case 'sub-2-8':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.93rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Vec>F</Vec>
            <Sub>s</Sub> <TightOp>=</TightOp> <TightOp>−</TightOp>
            <Var>k</Var>
            <Var>Δ</Var>
            <Vec>x</Vec>
          </div>
          <div className={`text-[0.8rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>k</Var>
            <Sub>par</Sub> <TightOp>=</TightOp> ∑ <Var>k</Var>
            <Sub>i</Sub>
          </div>
        </div>
      );

    case 'sub-2-9':
      return (
        <div className="flex flex-col items-center gap-1 font-serif text-[0.92rem] text-slate-100 leading-tight">
          <div className="whitespace-nowrap">
            <Vec>F</Vec>
            <Sub>r</Sub> <TightOp>=</TightOp> <TightOp>−</TightOp>
            <Var>k</Var>
            <Vec>v</Vec>
          </div>
          <div className={`text-[0.82rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>v</Var>
            <Sub>T</Sub> <TightOp>=</TightOp> <Frac num={<Var>mg</Var>} den={<Var>k</Var>} />
          </div>
        </div>
      );

    case 'sub-2-10':
      return (
        <div className="flex flex-col items-center gap-1 font-serif text-[0.91rem] text-slate-100 leading-tight">
          <div className="whitespace-nowrap">
            <Var>a</Var>
            <Sub>c</Sub> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  <Var>v</Var>
                  <Sup>2</Sup>
                </>
              }
              den={<Var>r</Var>}
            />
          </div>
          <div className={`text-[0.78rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>T</Var>
            <Sup>2</Sup> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  4π<Sup>2</Sup>
                </>
              }
              den={<Var>GM</Var>}
            />
            <Var>R</Var>
            <Sup>3</Sup>
          </div>
        </div>
      );

    // ── Unit 3: Work, Energy, and Power ─────────────────────────────────
    case 'sub-3-1':
      return (
        <div className="flex flex-col items-center gap-1 font-serif text-[0.94rem] text-slate-100 leading-tight">
          <div className="whitespace-nowrap">
            <Var>K</Var> <TightOp>=</TightOp> <Frac num="1" den="2" />
            <Var>m</Var>
            <Var>v</Var>
            <Sup>2</Sup>
          </div>
          <div className={`text-[0.79rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>K</Var>
            <Sub>obs</Sub> <TightOp>=</TightOp> <Frac num="1" den="2" />
            <Var>m</Var>|<Vec>v</Vec>
            <Sub>rel</Sub>|<Sup>2</Sup>
          </div>
        </div>
      );

    // ── Unit 8: Electric Charges, Fields, and Gauss's Law ───────────────
    case 'sub-8-1':
      return (
        <div className="flex items-center justify-center font-serif text-[0.9rem] text-slate-100 leading-tight">
          <span className="whitespace-nowrap">
            |<Vec>F</Vec>
            <Sub>E</Sub>| <TightOp>=</TightOp>{' '}
            <Frac
              num="1"
              den={
                <>
                  4π<Var>ε</Var>
                </>
              }
            />
            <Frac
              num={
                <>
                  |<Var>q</Var>
                  <Sub>1</Sub>
                  <Var>q</Var>
                  <Sub>2</Sub>|
                </>
              }
              den={
                <>
                  <Var>r</Var>
                  <Sup>2</Sup>
                </>
              }
            />
          </span>
        </div>
      );

    case 'sub-8-2':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.9rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <BigSum /> <Var>Q</Var>
            <Sub>i</Sub> <TightOp>=</TightOp> <BigSum /> <Var>Q</Var>
            <Sub>f</Sub>
          </div>
          <div className={`text-[0.79rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>Q</Var> <TightOp>=</TightOp> (<Var>N</Var>
            <Sub>p</Sub> <TightOp>−</TightOp> <Var>N</Var>
            <Sub>e</Sub>)<Var>e</Var>
          </div>
        </div>
      );

    case 'sub-8-3':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.92rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Vec>F</Vec> <TightOp>=</TightOp> <Var>q</Var>(<Vec>E</Vec> <TightOp>+</TightOp>{' '}
            <Vec>v</Vec> <Cross /> <Vec>B</Vec>)
          </div>
          <div className={`text-[0.8rem] ${secondaryTone} whitespace-nowrap`}>
            <Vec>E</Vec> <TightOp>=</TightOp> <Frac num={<Vec>F</Vec>} den={<Var>q</Var>} />
          </div>
        </div>
      );

    case 'sub-8-4':
      return (
        <div className="flex items-center justify-center font-serif text-[0.89rem] text-slate-100 leading-tight">
          <span className="whitespace-nowrap">
            <Vec>E</Vec> <TightOp>=</TightOp>{' '}
            <Frac
              num="1"
              den={
                <>
                  4π<Var>ε</Var>
                  <Sub>0</Sub>
                </>
              }
            />
            <BigInt />
            <Frac
              num={<Var>dq</Var>}
              den={
                <>
                  <Var>r</Var>
                  <Sup>2</Sup>
                </>
              }
            />
            <UnitHat>r</UnitHat>
          </span>
        </div>
      );

    case 'sub-8-5':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.94rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Var>Φ</Var>
            <Sub>E</Sub> <TightOp>=</TightOp> <BigInt /> <Vec>E</Vec> <Dot /> <Var>d</Var>
            <Vec>A</Vec>
          </div>
          <div className={`text-[0.8rem] ${secondaryTone} whitespace-nowrap`}>
            <Var>Φ</Var>
            <Sub>E</Sub> <TightOp>=</TightOp> <Var>EA</Var> cos<Var>θ</Var>
          </div>
        </div>
      );

    case 'sub-8-6':
      return (
        <div className="flex items-center justify-center font-serif text-[0.95rem] text-slate-100 leading-tight">
          <span className="whitespace-nowrap">
            <BigContourInt /> <Vec>E</Vec> <Dot /> <Var>d</Var>
            <Vec>A</Vec> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  <Var>Q</Var>
                  <Sub>enc</Sub>
                </>
              }
              den={
                <>
                  <Var>ε</Var>
                  <Sub>0</Sub>
                </>
              }
            />
          </span>
        </div>
      );

    // ── Unit 11 Summary: 3D Circuit Workbench & MNA Solver ──────────────
    case 'sub-11-summary':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.91rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <BigSum /> <Var>I</Var>
            <Sub>in</Sub> <TightOp>=</TightOp> <BigSum /> <Var>I</Var>
            <Sub>out</Sub>
          </div>
          <div className={`text-[0.82rem] ${secondaryTone} whitespace-nowrap`}>
            <BigSum /> <Var>Δ</Var>
            <Var>V</Var> <TightOp>=</TightOp> 0
          </div>
        </div>
      );

    default:
      return (
        <div className="text-xs font-serif text-slate-100">
          <MathFormula rawLatex={fallbackEquation} fallbackText={fallbackEquation} />
        </div>
      );
  }
};
