'use client';

import React from 'react';
import { Frac, Op, Sub, Var, Vec } from '@/components/ui/MathFormula';

/** Unit vector with crisp, tightly seated overhead circumflex hat */
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

export const Unit1HeroLawFormula: React.FC = () => (
  <span className="inline-flex items-center flex-wrap gap-x-2.5 font-serif text-[1.06rem] sm:text-[1.12rem] text-slate-100 leading-none">
    <span className="inline-flex items-center">
      <Vec>v</Vec>(<Var>t</Var>) <Op>=</Op>{' '}
      <Frac
        num={
          <>
            <Var>d</Var>
            <Vec>r</Vec>
          </>
        }
        den={
          <>
            <Var>d</Var>
            <Var>t</Var>
          </>
        }
      />
    </span>
    <span className="text-slate-500 font-sans select-none">,</span>
    <span className="inline-flex items-center">
      <Vec>a</Vec>(<Var>t</Var>) <Op>=</Op>{' '}
      <Frac
        num={
          <>
            <Var>d</Var>
            <Vec>v</Vec>
          </>
        }
        den={
          <>
            <Var>d</Var>
            <Var>t</Var>
          </>
        }
      />
    </span>
  </span>
);

export const Unit1SubtopicEquation: React.FC<{ subtopicId: string }> = ({ subtopicId }) => {
  switch (subtopicId) {
    case 'sub-1-1':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.94rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Vec>r</Vec> <TightOp>=</TightOp> <Var>A</Var>
            <UnitHat>i</UnitHat> <TightOp>+</TightOp> <Var>B</Var>
            <UnitHat>j</UnitHat> <TightOp>+</TightOp> <Var>C</Var>
            <UnitHat>k</UnitHat>
          </div>
          <div className="text-[0.84rem] text-teal-200/90 whitespace-nowrap">
            <UnitHat>r</UnitHat> <TightOp>=</TightOp>{' '}
            <Frac
              num={<Vec>r</Vec>}
              den={
                <>
                  |<Vec>r</Vec>|
                </>
              }
            />
          </div>
        </div>
      );

    case 'sub-1-2':
      return (
        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 font-serif text-[0.98rem] text-slate-100 leading-none">
          <span className="whitespace-nowrap">
            <Vec>v</Vec> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  <Var>d</Var>
                  <Vec>r</Vec>
                </>
              }
              den={
                <>
                  <Var>d</Var>
                  <Var>t</Var>
                </>
              }
            />
          </span>
          <span className="text-slate-500 font-sans">,</span>
          <span className="whitespace-nowrap">
            <Vec>a</Vec> <TightOp>=</TightOp>{' '}
            <Frac
              num={
                <>
                  <Var>d</Var>
                  <Vec>v</Vec>
                </>
              }
              den={
                <>
                  <Var>d</Var>
                  <Var>t</Var>
                </>
              }
            />
          </span>
        </div>
      );

    case 'sub-1-3':
      return (
        <div className="flex flex-col items-center gap-1 font-serif text-[0.9rem] text-slate-100 leading-tight">
          <div className="whitespace-nowrap">
            <Var>m</Var>
            <Frac
              num={
                <>
                  <Var>d</Var>
                  <Vec>v</Vec>
                </>
              }
              den={
                <>
                  <Var>d</Var>
                  <Var>t</Var>
                </>
              }
            />
            <TightOp>=</TightOp>
            <Var>m</Var>
            <Vec>g</Vec>
            <TightOp>−</TightOp>
            <Vec>F</Vec>
            <Sub>d</Sub>
          </div>
          <div className="text-[0.78rem] text-teal-200/85 whitespace-nowrap">
            <Vec>F</Vec>
            <Sub>d</Sub> <TightOp>=</TightOp> <Var>b</Var>
            <Vec>v</Vec> <TightOp>+</TightOp> <Var>c</Var>|<Vec>v</Vec>|<Vec>v</Vec>
          </div>
        </div>
      );

    case 'sub-1-4':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.94rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Vec>v</Vec>
            <Sub>P/E</Sub> <TightOp>=</TightOp> <Vec>v</Vec>
            <Sub>P/M</Sub> <TightOp>+</TightOp> <Vec>v</Vec>
            <Sub>M/E</Sub>
          </div>
          <div className="text-[0.82rem] text-teal-200/85 whitespace-nowrap">
            <Vec>a</Vec>
            <Sub>P/E</Sub> <TightOp>=</TightOp> <Vec>a</Vec>
            <Sub>P/M</Sub>
          </div>
        </div>
      );

    case 'sub-1-5':
      return (
        <div className="flex flex-col items-center gap-1.5 font-serif text-[0.93rem] text-slate-100 leading-snug">
          <div className="whitespace-nowrap">
            <Vec>r</Vec>(<Var>t</Var>) <TightOp>=</TightOp> <Var>x</Var>(<Var>t</Var>)
            <UnitHat>i</UnitHat> <TightOp>+</TightOp> <Var>y</Var>(<Var>t</Var>)
            <UnitHat>j</UnitHat>
          </div>
          <div className="text-[0.82rem] text-teal-200/85 whitespace-nowrap">
            <Var>v</Var>
            <Sub>x</Sub> <TightOp>⊥</TightOp> <Var>v</Var>
            <Sub>y</Sub>
          </div>
        </div>
      );

    default:
      return <Unit1HeroLawFormula />;
  }
};
