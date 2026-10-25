'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Table,
  Layers,
  Sigma,
  Zap,
  Orbit,
  ArrowRight,
  Compass,
} from 'lucide-react';
import {
  Var,
  Vec,
  Frac,
  Sub,
  Sup,
  Dot,
  Cross,
  Op,
  BigSum,
  BigInt,
  BigContourInt,
} from './MathFormula';

export interface CalculusTheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: 'mechanics' | 'em';
}

export const CalculusTheoryModal: React.FC<CalculusTheoryModalProps> = ({
  isOpen,
  onClose,
  course = 'mechanics',
}) => {
  const [userSelectedCourse, setUserSelectedCourse] = useState<'mechanics' | 'em' | null>(null);
  const [userSelectedTab, setUserSelectedTab] = useState<
    'constants' | 'equations' | 'em_equations' | 'geometry' | null
  >(null);

  const activeCourse = userSelectedCourse ?? course;
  const activeTab =
    userSelectedTab ?? (activeCourse === 'mechanics' ? 'equations' : 'em_equations');

  if (!isOpen) return null;

  const isMechanics = activeCourse === 'mechanics';
  const pdfUrl = isMechanics
    ? '/assets/aistudio/Mechanics_Formula_Sheet_388c2fc2.pdf'
    : '/assets/aistudio/E_M_Formula_Sheet_dc063adc.pdf';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-text">
      <div
        className={`w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border transition-colors duration-300 ${
          isMechanics
            ? 'bg-[#050f0c] border-emerald-500/30'
            : 'bg-[#060c18] border-sky-500/30'
        }`}
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER: TITLE, COURSE TOGGLE, EXTERNAL PDF LINK, CLOSE BUTTON      */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-black/40">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isMechanics
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                    isMechanics
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  OFFICIAL COLLEGE BOARD CED APPENDIX
                </span>
                <span className="text-slate-400 text-xs hidden sm:inline">· 2025–2026 Edition</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                {isMechanics
                  ? 'AP Physics C: Mechanics — Official Formula Sheet'
                  : 'AP Physics C: Electricity & Magnetism — Official Formula Sheet'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Switch between Mechanics and E&M Formula Sheets */}
            <div className="bg-black/60 p-1 rounded-xl border border-white/10 flex items-center text-xs">
              <button
                onClick={() => {
                  setUserSelectedCourse('mechanics');
                  setUserSelectedTab('equations');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  isMechanics
                    ? 'bg-emerald-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Orbit className="w-3.5 h-3.5" />
                <span>Mechanics</span>
              </button>
              <button
                onClick={() => {
                  setUserSelectedCourse('em');
                  setUserSelectedTab('em_equations');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  !isMechanics
                    ? 'bg-sky-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>E&amp;M</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB NAVIGATION BAR (MATCHES SECTIONS OF THE ATTACHED FORMULA SHEETS)      */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 border-b border-white/10 bg-black/40 flex items-center gap-2.5 text-xs font-semibold overflow-x-auto shrink-0 min-h-[58px]">
          <button
            onClick={() => setUserSelectedTab('constants')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'constants'
                ? isMechanics
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table of Information (Constants, Prefixes &amp; Trig)</span>
          </button>

          {isMechanics ? (
            <button
              onClick={() => setUserSelectedTab('equations')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'equations'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>Mechanics Equations</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setUserSelectedTab('em_equations')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === 'em_equations'
                    ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Electricity &amp; Magnetism Equations</span>
              </button>
              <button
                onClick={() => setUserSelectedTab('equations')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === 'equations'
                    ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
                }`}
              >
                <Orbit className="w-3.5 h-3.5" />
                <span>Mechanics Equations</span>
              </button>
            </>
          )}

          <button
            onClick={() => setUserSelectedTab('geometry')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'geometry'
                ? isMechanics
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Geometry, Trigonometry, Vectors &amp; Calculus</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SCROLLABLE FORMULA SHEET BODY WITH EXACT HANDWRITTEN MATH NOTATION        */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 text-xs">
          {/* TAB 1: CONSTANTS, PREFIXES, UNIT SYMBOLS, TRIG TABLE & CONVENTIONS */}
          {activeTab === 'constants' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="border border-white/10 rounded-2xl p-4 bg-black/40">
                <div className="text-center font-bold text-sm tracking-wide text-white uppercase border-b border-white/10 pb-2 mb-3">
                  {isMechanics
                    ? 'ADVANCED PLACEMENT PHYSICS C: MECHANICS TABLE OF INFORMATION'
                    : 'ADVANCED PLACEMENT PHYSICS C: ELECTRICITY AND MAGNETISM TABLE OF INFORMATION'}
                </div>

                {/* Constants Table */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                    Constants and Conversion Factors
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {!isMechanics && (
                      <>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Coulomb constant:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>k</Var> <Op>=</Op> <Frac num="1" den={<>4<Var>π</Var><Var>ε</Var><Sub>0</Sub></>} /> <Op>=</Op> 9.0<Op>×</Op>10<Sup>9</Sup> N<Dot />m<Sup>2</Sup>/C<Sup>2</Sup>
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Vacuum permittivity:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>ε</Var><Sub>0</Sub> <Op>=</Op> 8.85<Op>×</Op>10<Sup>-12</Sup> C<Sup>2</Sup>/(N<Dot />m<Sup>2</Sup>)
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Vacuum permeability:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>μ</Var><Sub>0</Sub> <Op>=</Op> 4<Var>π</Var><Op>×</Op>10<Sup>-7</Sup> (T<Dot />m)/A
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Proton mass:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>m</Var><Sub>p</Sub> <Op>=</Op> 1.67<Op>×</Op>10<Sup>-27</Sup> kg
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Neutron mass:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>m</Var><Sub>n</Sub> <Op>=</Op> 1.67<Op>×</Op>10<Sup>-27</Sup> kg
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Electron mass:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>m</Var><Sub>e</Sub> <Op>=</Op> 9.11<Op>×</Op>10<Sup>-31</Sup> kg
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Elementary charge:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>e</Var> <Op>=</Op> 1.60<Op>×</Op>10<Sup>-19</Sup> C
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">1 electron volt:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            1 eV <Op>=</Op> 1.60<Op>×</Op>10<Sup>-19</Sup> J
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">Speed of light:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            <Var>c</Var> <Op>=</Op> 3.00<Op>×</Op>10<Sup>8</Sup> m/s
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                          <span className="text-slate-300">1 unified atomic mass unit:</span>
                          <span className="font-serif font-bold text-sky-300 text-right">
                            1 u <Op>=</Op> 1.66<Op>×</Op>10<Sup>-27</Sup> kg <Op>=</Op> 931 MeV/<Var>c</Var><Sup>2</Sup>
                          </span>
                        </div>
                      </>
                    )}

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2 md:col-span-2">
                      <span className="text-slate-300">Universal gravitational constant:</span>
                      <span className="font-serif font-bold text-emerald-300 text-right">
                        <Var>G</Var> <Op>=</Op> 6.67<Op>×</Op>10<Sup>-11</Sup> m<Sup>3</Sup>/(kg<Dot />s<Sup>2</Sup>) <Op>=</Op> 6.67<Op>×</Op>10<Sup>-11</Sup> N<Dot />m<Sup>2</Sup>/kg<Sup>2</Sup>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                      <span className="text-slate-300">Magnitude of gravitational acceleration at Earth’s surface:</span>
                      <span className="font-serif font-bold text-emerald-300 text-right">
                        <Var>g</Var> <Op>=</Op> 9.8 m/s<Sup>2</Sup>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-baseline justify-between gap-2">
                      <span className="text-slate-300">Magnitude of gravitational field strength at Earth’s surface:</span>
                      <span className="font-serif font-bold text-emerald-300 text-right">
                        <Var>g</Var> <Op>=</Op> 9.8 N/kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prefixes and Unit Symbols Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prefixes Table */}
                <div className="border border-white/10 rounded-2xl p-4 bg-black/40 space-y-2">
                  <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                    PREFIXES
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="py-1">Factor</th>
                          <th className="py-1">Prefix</th>
                          <th className="py-1">Symbol</th>
                          <th className="py-1">Factor</th>
                          <th className="py-1">Prefix</th>
                          <th className="py-1">Symbol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="py-1 text-slate-300">10<Sup>12</Sup></td>
                          <td className="py-1">tera</td>
                          <td className="py-1 font-bold text-emerald-400">T</td>
                          <td className="py-1 text-slate-300">10<Sup>-2</Sup></td>
                          <td className="py-1">centi</td>
                          <td className="py-1 font-bold text-emerald-400">c</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-300">10<Sup>9</Sup></td>
                          <td className="py-1">giga</td>
                          <td className="py-1 font-bold text-emerald-400">G</td>
                          <td className="py-1 text-slate-300">10<Sup>-3</Sup></td>
                          <td className="py-1">milli</td>
                          <td className="py-1 font-bold text-emerald-400">m</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-300">10<Sup>6</Sup></td>
                          <td className="py-1">mega</td>
                          <td className="py-1 font-bold text-emerald-400">M</td>
                          <td className="py-1 text-slate-300">10<Sup>-6</Sup></td>
                          <td className="py-1">micro</td>
                          <td className="py-1 font-bold text-emerald-400">μ</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-300">10<Sup>3</Sup></td>
                          <td className="py-1">kilo</td>
                          <td className="py-1 font-bold text-emerald-400">k</td>
                          <td className="py-1 text-slate-300">10<Sup>-9</Sup></td>
                          <td className="py-1">nano</td>
                          <td className="py-1 font-bold text-emerald-400">n</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-300">—</td>
                          <td className="py-1">—</td>
                          <td className="py-1">—</td>
                          <td className="py-1 text-slate-300">10<Sup>-12</Sup></td>
                          <td className="py-1">pico</td>
                          <td className="py-1 font-bold text-emerald-400">p</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unit Symbols Table */}
                <div className="border border-white/10 rounded-2xl p-4 bg-black/40 space-y-2">
                  <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                    UNIT SYMBOLS
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">hertz</span>
                        <span className="text-white font-bold">Hz</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">joule</span>
                        <span className="text-white font-bold">J</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">kilogram</span>
                        <span className="text-white font-bold">kg</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">meter</span>
                        <span className="text-white font-bold">m</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">newton</span>
                        <span className="text-white font-bold">N</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">second</span>
                        <span className="text-white font-bold">s</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-0.5">
                        <span className="text-slate-400">watt</span>
                        <span className="text-white font-bold">W</span>
                      </div>
                    </div>
                    {!isMechanics && (
                      <div className="space-y-1">
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">ampere</span>
                          <span className="text-sky-300 font-bold">A</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">coulomb</span>
                          <span className="text-sky-300 font-bold">C</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">electron volt</span>
                          <span className="text-sky-300 font-bold">eV</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">farad</span>
                          <span className="text-sky-300 font-bold">F</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">henry</span>
                          <span className="text-sky-300 font-bold">H</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">ohm</span>
                          <span className="text-sky-300 font-bold">Ω</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">tesla</span>
                          <span className="text-sky-300 font-bold">T</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                          <span className="text-slate-400">volt</span>
                          <span className="text-sky-300 font-bold">V</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Values of Trigonometric Functions for Common Angles Table */}
              <div className="border border-white/10 rounded-2xl p-4 bg-black/40 space-y-2">
                <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                  VALUES OF TRIGONOMETRIC FUNCTIONS FOR COMMON ANGLES
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs font-serif border border-white/10">
                    <thead className="bg-white/5 border-b border-white/10 font-sans">
                      <tr>
                        <th className="py-2 px-3 border-r border-white/10 font-bold"><Var>θ</Var></th>
                        <th className="py-2 px-3 border-r border-white/10">0°</th>
                        <th className="py-2 px-3 border-r border-white/10">30°</th>
                        <th className="py-2 px-3 border-r border-white/10">37°</th>
                        <th className="py-2 px-3 border-r border-white/10">45°</th>
                        <th className="py-2 px-3 border-r border-white/10">53°</th>
                        <th className="py-2 px-3 border-r border-white/10">60°</th>
                        <th className="py-2 px-3">90°</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-serif">
                      <tr>
                        <td className="py-2 px-3 font-bold bg-white/5 border-r border-white/10">sin <Var>θ</Var></td>
                        <td className="py-2 px-3 border-r border-white/10">0</td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="1" den="2" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="3" den="5" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num={<>√2</>} den="2" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="4" den="5" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num={<>√3</>} den="2" /></td>
                        <td className="py-2 px-3 font-bold">1</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold bg-white/5 border-r border-white/10">cos <Var>θ</Var></td>
                        <td className="py-2 px-3 border-r border-white/10 font-bold">1</td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num={<>√3</>} den="2" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="4" den="5" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num={<>√2</>} den="2" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="3" den="5" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="1" den="2" /></td>
                        <td className="py-2 px-3">0</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold bg-white/5 border-r border-white/10">tan <Var>θ</Var></td>
                        <td className="py-2 px-3 border-r border-white/10">0</td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num={<>√3</>} den="3" /></td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="3" den="4" /></td>
                        <td className="py-2 px-3 border-r border-white/10 font-bold">1</td>
                        <td className="py-2 px-3 border-r border-white/10"><Frac num="4" den="3" /></td>
                        <td className="py-2 px-3 border-r border-white/10 font-bold">√3</td>
                        <td className="py-2 px-3 font-sans font-bold">∞</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conventions Box */}
              <div className="border border-white/10 rounded-2xl p-4 bg-black/40 space-y-2">
                <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                  Conventions Used in This Exam
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-xs">
                  <li>The frame of reference of any problem is assumed to be inertial unless otherwise stated.</li>
                  {isMechanics ? (
                    <>
                      <li>Air resistance is assumed to be negligible unless otherwise stated.</li>
                      <li>Springs and strings are assumed to be ideal unless otherwise stated.</li>
                    </>
                  ) : (
                    <>
                      <li>Frictional forces and air resistance are negligible.</li>
                      <li>Strings, springs, batteries, wires, and meters are ideal.</li>
                      <li>The electric potential is zero at an infinite distance from an isolated point charge.</li>
                      <li>The direction of current is the direction in which positive charges would drift.</li>
                      <li>Resistors and lightbulbs are ohmic.</li>
                      <li>Capacitors are air-filled (<Var>κ</Var> = 1.0).</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: MECHANICS EQUATIONS (PAGE 2) */}
          {activeTab === 'equations' && (
            <div className="space-y-6">
              <div className="border border-white/10 rounded-2xl p-4 bg-black/40">
                <div className="text-center font-bold text-sm tracking-wide text-white uppercase border-b border-white/10 pb-2 mb-4">
                  MECHANICS EQUATIONS (ADVANCED PLACEMENT PHYSICS C)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column 1: Kinematics, Dynamics, Work, Energy, Momentum */}
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold text-emerald-400 uppercase border-b border-white/10 pb-1">
                      Translational Motion, Energy &amp; Momentum
                    </div>

                    {/* Kinematics */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Kinematics &amp; Calculus</div>
                      <div className="flex flex-col gap-1.5">
                        <div><Var>v</Var><Sub>x</Sub> <Op>=</Op> <Var>v</Var><Sub>x0</Sub> <Op>+</Op> <Var>a</Var><Sub>x</Sub><Var>t</Var></div>
                        <div><Var>x</Var> <Op>=</Op> <Var>x</Var><Sub>0</Sub> <Op>+</Op> <Var>v</Var><Sub>x0</Sub><Var>t</Var> <Op>+</Op> <Frac num="1" den="2" /><Var>a</Var><Sub>x</Sub><Var>t</Var><Sup>2</Sup></div>
                        <div><Var>v</Var><Sub>x</Sub><Sup>2</Sup> <Op>=</Op> <Var>v</Var><Sub>x0</Sub><Sup>2</Sup> <Op>+</Op> 2<Var>a</Var><Sub>x</Sub>(<Var>x</Var> <Op>-</Op> <Var>x</Var><Sub>0</Sub>)</div>
                        <div><Var>Δx</Var> <Op>=</Op> <BigInt /><Var>v</Var><Sub>x</Sub>(<Var>t</Var>)<Var>dt</Var></div>
                        <div><Var>Δv</Var><Sub>x</Sub> <Op>=</Op> <BigInt /><Var>a</Var><Sub>x</Sub>(<Var>t</Var>)<Var>dt</Var></div>
                      </div>
                    </div>

                    {/* Center of Mass & Linear Mass Density */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Center of Mass &amp; Linear Density</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Vec>x</Vec><Sub>cm</Sub> <Op>=</Op> <Frac num={<><BigSum /><Var>m</Var><Sub>i</Sub><Vec>x</Vec><Sub>i</Sub></>} den={<><BigSum /><Var>m</Var><Sub>i</Sub></>} />
                        </div>
                        <div>
                          <Vec>r</Vec><Sub>cm</Sub> <Op>=</Op> <Frac num={<><BigInt /><Vec>r</Vec><Var>dm</Var></>} den={<><BigInt /><Var>dm</Var></>} />
                        </div>
                        <div>
                          <Var>λ</Var> <Op>=</Op> <Frac num="d" den="dℓ" /><Var>m</Var>(<Var>ℓ</Var>)
                        </div>
                      </div>
                    </div>

                    {/* Newton's 2nd Law, Forces & Gravitation */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Dynamics &amp; Fundamental Forces</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Vec>a</Vec><Sub>sys</Sub> <Op>=</Op> <Frac num={<><BigSum /><Vec>F</Vec></>} den={<><Var>m</Var><Sub>sys</Sub></>} /> <Op>=</Op> <Frac num={<><Vec>F</Vec><Sub>net</Sub></>} den={<><Var>m</Var><Sub>sys</Sub></>} />
                        </div>
                        <div>
                          |<Vec>F</Vec><Sub>g</Sub>| <Op>=</Op> <Var>G</Var> <Frac num={<><Var>m</Var><Sub>1</Sub><Var>m</Var><Sub>2</Sub></>} den={<><Var>r</Var><Sup>2</Sup></>} />
                        </div>
                        <div>
                          |<Vec>F</Vec><Sub>f</Sub>| <Op>≤</Op> <Var>μ</Var> |<Vec>F</Vec><Sub>N</Sub>|
                        </div>
                        <div>
                          <Vec>F</Vec><Sub>s</Sub> <Op>=</Op> <Op>-</Op><Var>k</Var><Var>Δ</Var><Vec>x</Vec>
                        </div>
                        <div>
                          <Var>a</Var><Sub>c</Sub> <Op>=</Op> <Frac num={<><Var>v</Var><Sup>2</Sup></>} den="r" /> <Op>=</Op> <Var>r</Var><Var>ω</Var><Sup>2</Sup>
                        </div>
                        <div>
                          <Var>T</Var> <Op>=</Op> <Frac num="1" den="f" />
                        </div>
                      </div>
                    </div>

                    {/* Work, Energy, Potential & Power */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Work, Energy, Conservative Fields &amp; Power</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>K</Var> <Op>=</Op> <Frac num="1" den="2" /><Var>m</Var><Var>v</Var><Sup>2</Sup>
                        </div>
                        <div>
                          <Var>W</Var> <Op>=</Op> <BigInt sub="a" sup="b" /><Vec>F</Vec><Dot /><Var>d</Var><Vec>r</Vec>
                        </div>
                        <div>
                          <Var>ΔK</Var> <Op>=</Op> <BigSum /><Var>W</Var><Sub>i</Sub> <Op>=</Op> <BigSum /><Var>F</Var><Sub>||,i</Sub><Var>d</Var><Sub>i</Sub>
                        </div>
                        <div>
                          <Var>ΔU</Var> <Op>=</Op> <Op>-</Op><BigInt sub="a" sup="b" /><Vec>F</Vec><Sub>cf</Sub>(<Var>r</Var>)<Dot /><Var>d</Var><Vec>r</Vec>
                        </div>
                        <div>
                          <Var>F</Var><Sub>x</Sub> <Op>=</Op> <Op>-</Op><Frac num={<><Var>dU</Var>(<Var>x</Var>)</>} den="dx" />
                        </div>
                        <div>
                          <Var>U</Var><Sub>s</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>k</Var>(<Var>Δx</Var>)<Sup>2</Sup>
                        </div>
                        <div>
                          <Var>U</Var><Sub>G</Sub> <Op>=</Op> <Op>-</Op><Var>G</Var> <Frac num={<><Var>m</Var><Sub>1</Sub><Var>m</Var><Sub>2</Sub></>} den="r" />
                        </div>
                        <div>
                          <Var>ΔU</Var><Sub>g</Sub> <Op>=</Op> <Var>mg</Var><Var>Δy</Var>
                        </div>
                        <div>
                          <Var>P</Var><Sub>avg</Sub> <Op>=</Op> <Frac num="W" den="Δt" /> <Op>=</Op> <Frac num="ΔE" den="Δt" />
                        </div>
                        <div>
                          <Var>P</Var><Sub>inst</Sub> <Op>=</Op> <Frac num="dW" den="dt" />
                        </div>
                      </div>
                    </div>

                    {/* Momentum & Impulse */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Linear Momentum &amp; Impulse</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Vec>p</Vec> <Op>=</Op> <Var>m</Var><Vec>v</Vec>
                        </div>
                        <div>
                          <Vec>F</Vec><Sub>net</Sub> <Op>=</Op> <Frac num={<><Var>d</Var><Vec>p</Vec></>} den="dt" />
                        </div>
                        <div>
                          <Vec>J</Vec> <Op>=</Op> <BigInt /><Vec>F</Vec><Sub>net</Sub>(<Var>t</Var>)<Var>dt</Var> <Op>=</Op> <Var>Δ</Var><Vec>p</Vec>
                        </div>
                        <div>
                          <Vec>v</Vec><Sub>cm</Sub> <Op>=</Op> <Frac num={<><BigSum /><Vec>p</Vec><Sub>i</Sub></>} den={<><BigSum /><Var>m</Var><Sub>i</Sub></>} /> <Op>=</Op> <Frac num={<><BigSum /><Var>m</Var><Sub>i</Sub><Vec>v</Vec><Sub>i</Sub></>} den={<><BigSum /><Var>m</Var><Sub>i</Sub></>} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Rotational Dynamics, Oscillations */}
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold text-emerald-400 uppercase border-b border-white/10 pb-1">
                      Rotational Dynamics &amp; Oscillations
                    </div>

                    {/* Angular Kinematics */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Angular Kinematics</div>
                      <div className="flex flex-col gap-1.5">
                        <div><Var>ω</Var> <Op>=</Op> <Frac num="dθ" den="dt" /></div>
                        <div><Var>α</Var> <Op>=</Op> <Frac num="dω" den="dt" /></div>
                        <div><Var>ω</Var> <Op>=</Op> <Var>ω</Var><Sub>0</Sub> <Op>+</Op> <Var>αt</Var></div>
                        <div><Var>θ</Var> <Op>=</Op> <Var>θ</Var><Sub>0</Sub> <Op>+</Op> <Var>ω</Var><Sub>0</Sub><Var>t</Var> <Op>+</Op> <Frac num="1" den="2" /><Var>αt</Var><Sup>2</Sup></div>
                        <div><Var>ω</Var><Sup>2</Sup> <Op>=</Op> <Var>ω</Var><Sub>0</Sub><Sup>2</Sup> <Op>+</Op> 2<Var>α</Var>(<Var>θ</Var> <Op>-</Op> <Var>θ</Var><Sub>0</Sub>)</div>
                        <div><Var>v</Var> <Op>=</Op> <Var>rω</Var></div>
                        <div><Var>a</Var><Sub>T</Sub> <Op>=</Op> <Var>rα</Var></div>
                      </div>
                    </div>

                    {/* Torque & Rotational Inertia */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Torque, Inertia &amp; Newton&apos;s 2nd Rotational Law</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Vec>τ</Vec> <Op>=</Op> <Vec>r</Vec> <Cross /> <Vec>F</Vec>
                        </div>
                        <div>
                          <Var>I</Var><Sub>tot</Sub> <Op>=</Op> <BigSum /><Var>I</Var><Sub>i</Sub> <Op>=</Op> <BigSum /><Var>m</Var><Sub>i</Sub><Var>r</Var><Sub>i</Sub><Sup>2</Sup>
                        </div>
                        <div>
                          <Var>I</Var> <Op>=</Op> <BigInt /><Var>r</Var><Sup>2</Sup><Var>dm</Var>
                        </div>
                        <div>
                          <Var>I&apos;</Var> <Op>=</Op> <Var>I</Var><Sub>cm</Sub> <Op>+</Op> <Var>M</Var><Var>d</Var><Sup>2</Sup> <span className="text-[11px] text-slate-400 font-sans ml-2">(Parallel Axis Theorem)</span>
                        </div>
                        <div>
                          <Vec>α</Vec><Sub>sys</Sub> <Op>=</Op> <Frac num={<><BigSum /><Vec>τ</Vec></>} den={<><Var>I</Var><Sub>sys</Sub></>} /> <Op>=</Op> <Frac num={<><Vec>τ</Vec><Sub>net</Sub></>} den={<><Var>I</Var><Sub>sys</Sub></>} />
                        </div>
                      </div>
                    </div>

                    {/* Rotational Energy & Angular Momentum */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Rotational Energy &amp; Angular Momentum</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>K</Var><Sub>rot</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>I</Var><Var>ω</Var><Sup>2</Sup>
                        </div>
                        <div>
                          <Var>W</Var> <Op>=</Op> <BigInt /><Var>τ</Var><Dot /><Var>dθ</Var>
                        </div>
                        <div>
                          <Vec>L</Vec> <Op>=</Op> <Vec>r</Vec> <Cross /> <Vec>p</Vec> <Op>=</Op> <Var>I</Var><Vec>ω</Vec>
                        </div>
                        <div>
                          <Var>ΔL</Var> <Op>=</Op> <BigInt /><Var>τ</Var><Var>dt</Var>
                        </div>
                        <div>
                          <Var>Δx</Var><Sub>cm</Sub> <Op>=</Op> <Var>r</Var><Var>Δθ</Var>
                        </div>
                      </div>
                    </div>

                    {/* Simple Harmonic Motion & Oscillations */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Simple Harmonic Motion &amp; Oscillations</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>T</Var> <Op>=</Op> <Frac num="2π" den="ω" /> <Op>=</Op> <Frac num="1" den="f" />
                        </div>
                        <div>
                          <Var>T</Var><Sub>s</Sub> <Op>=</Op> 2<Var>π</Var> <span className="inline-flex items-center">√<span className="border-t border-current ml-0.5"><Frac num="m" den="k" /></span></span>
                        </div>
                        <div>
                          <Var>T</Var><Sub>p</Sub> <Op>=</Op> 2<Var>π</Var> <span className="inline-flex items-center">√<span className="border-t border-current ml-0.5"><Frac num="ℓ" den="g" /></span></span>
                        </div>
                        <div>
                          <Var>T</Var><Sub>phys</Sub> <Op>=</Op> 2<Var>π</Var> <span className="inline-flex items-center">√<span className="border-t border-current ml-0.5"><Frac num="I" den="mgd" /></span></span>
                        </div>
                        <div>
                          <Var>x</Var> <Op>=</Op> <Var>x</Var><Sub>max</Sub> cos(<Var>ωt</Var> <Op>+</Op> <Var>ϕ</Var>)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Symbols Legend Box for Mechanics */}
                <div className="mt-5 pt-4 border-t border-white/10 text-xs">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Official Mechanics Variables &amp; Symbols Legend
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 font-mono">
                    <div><Var>a</Var> = acceleration</div>
                    <div><Var>d</Var> = distance</div>
                    <div><Var>E</Var> = energy</div>
                    <div><Var>f</Var> = frequency</div>
                    <div><Var>F</Var> = force</div>
                    <div><Var>I</Var> = rotational inertia</div>
                    <div><Var>J</Var> = impulse</div>
                    <div><Var>k</Var> = spring constant</div>
                    <div><Var>K</Var> = kinetic energy</div>
                    <div><Var>ℓ</Var> = length</div>
                    <div><Var>L</Var> = angular momentum</div>
                    <div><Var>m</Var>, <Var>M</Var> = mass</div>
                    <div><Var>p</Var> = momentum</div>
                    <div><Var>P</Var> = power</div>
                    <div><Var>r</Var> = radius or distance</div>
                    <div><Var>t</Var> = time</div>
                    <div><Var>T</Var> = period</div>
                    <div><Var>U</Var> = potential energy</div>
                    <div><Var>v</Var> = velocity or speed</div>
                    <div><Var>W</Var> = work</div>
                    <div><Var>x</Var> = position</div>
                    <div><Var>y</Var> = vertical position</div>
                    <div><Var>α</Var> = angular acceleration</div>
                    <div><Var>θ</Var> = angular position</div>
                    <div><Var>λ</Var> = linear mass density</div>
                    <div><Var>μ</Var> = friction coefficient</div>
                    <div><Var>τ</Var> = torque</div>
                    <div><Var>ϕ</Var> = phase angle</div>
                    <div><Var>ω</Var> = angular frequency</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ELECTRICITY & MAGNETISM EQUATIONS (PAGE 2) */}
          {activeTab === 'em_equations' && (
            <div className="space-y-6">
              <div className="border border-white/10 rounded-2xl p-4 bg-black/40">
                <div className="text-center font-bold text-sm tracking-wide text-white uppercase border-b border-white/10 pb-2 mb-4">
                  ELECTRICITY AND MAGNETISM EQUATIONS (ADVANCED PLACEMENT PHYSICS C)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column 1: Electrostatics, Gauss's Law, Potential, Capacitors, Current & Resistance */}
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold text-sky-400 uppercase border-b border-white/10 pb-1">
                      Electrostatics, Gauss, Potential &amp; DC Conduction
                    </div>

                    {/* Coulomb's Law & Electric Fields */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Coulomb&apos;s Law &amp; Electric Field Formulations</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          |<Vec>F</Vec><Sub>E</Sub>| <Op>=</Op> <Frac num="1" den={<>4<Var>π</Var><Var>ε</Var><Sub>0</Sub></>} /> <Frac num={<>|<Var>q</Var><Sub>1</Sub><Var>q</Var><Sub>2</Sub>|</>} den={<><Var>r</Var><Sup>2</Sup></>} /> <Op>=</Op> <Var>k</Var> <Frac num={<>|<Var>q</Var><Sub>1</Sub><Var>q</Var><Sub>2</Sub>|</>} den={<><Var>r</Var><Sup>2</Sup></>} />
                        </div>
                        <div>
                          <Vec>E</Vec> <Op>=</Op> <Frac num={<><Vec>F</Vec><Sub>E</Sub></>} den="q" />
                        </div>
                        <div>
                          <Vec>E</Vec> <Op>=</Op> <Frac num="1" den={<>4<Var>π</Var><Var>ε</Var><Sub>0</Sub></>} /> <BigInt /><Frac num="dq" den={<><Var>r</Var><Sup>2</Sup></>} /><span className="font-serif not-italic tracking-normal"> r̂</span>
                        </div>
                        <div>
                          <Var>Φ</Var><Sub>E</Sub> <Op>=</Op> <BigInt /><Vec>E</Vec><Dot /><Var>d</Var><Vec>A</Vec>
                        </div>
                        <div>
                          <BigContourInt /><Vec>E</Vec><Dot /><Var>d</Var><Vec>A</Vec> <Op>=</Op> <Frac num={<><Var>q</Var><Sub>enc</Sub></>} den={<><Var>ε</Var><Sub>0</Sub></>} /> <span className="text-[11px] font-sans text-slate-400 ml-2">(Gauss&apos;s Law)</span>
                        </div>
                        <div>
                          <Var>Q</Var><Sub>total</Sub> <Op>=</Op> <BigInt /><Var>ρ</Var>(<Var>r</Var>)<Var>dV</Var>
                        </div>
                      </div>
                    </div>

                    {/* Electric Potential & Conservative Work */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Electric Potential &amp; Gradient</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>U</Var><Sub>E</Sub> <Op>=</Op> <Frac num="1" den={<>4<Var>π</Var><Var>ε</Var><Sub>0</Sub></>} /> <Frac num={<><Var>q</Var><Sub>1</Sub><Var>q</Var><Sub>2</Sub></>} den="r" />
                        </div>
                        <div>
                          <Var>V</Var> <Op>=</Op> <Frac num="1" den={<>4<Var>π</Var><Var>ε</Var><Sub>0</Sub></>} /> <BigInt /><Frac num="dq" den="r" />
                        </div>
                        <div>
                          <Var>ΔV</Var> <Op>=</Op> <Op>-</Op><BigInt sub="a" sup="b" /><Vec>E</Vec><Dot /><Var>d</Var><Vec>r</Vec>
                        </div>
                        <div>
                          <Var>E</Var><Sub>x</Sub> <Op>=</Op> <Op>-</Op><Frac num="dV" den="dx" />
                        </div>
                        <div>
                          <Var>ΔU</Var><Sub>E</Sub> <Op>=</Op> <Var>q</Var><Var>ΔV</Var>
                        </div>
                      </div>
                    </div>

                    {/* Capacitors & Dielectrics */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Capacitance &amp; Dielectrics</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>C</Var> <Op>=</Op> <Frac num="Q" den="ΔV" />
                        </div>
                        <div>
                          <Var>C</Var> <Op>=</Op> <Frac num={<><Var>κ</Var><Var>ε</Var><Sub>0</Sub><Var>A</Var></>} den="d" />
                        </div>
                        <div>
                          <Var>U</Var><Sub>C</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>Q</Var><Var>ΔV</Var>
                        </div>
                        <div>
                          <Var>κ</Var> <Op>=</Op> <Frac num="ε" den={<><Var>ε</Var><Sub>0</Sub></>} />
                        </div>
                      </div>
                    </div>

                    {/* Electric Current & Ohm's Law */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Electric Current, Drift &amp; Resistance</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>I</Var> <Op>=</Op> <Frac num="dq" den="dt" />
                        </div>
                        <div>
                          <Var>I</Var> <Op>=</Op> <BigInt /><Vec>J</Vec><Dot /><Var>d</Var><Vec>A</Vec>
                        </div>
                        <div>
                          <Vec>E</Vec> <Op>=</Op> <Var>ρ</Var><Vec>J</Vec> <span className="text-[11px] font-sans text-slate-400 ml-2">(Microscopic Ohm&apos;s Law)</span>
                        </div>
                        <div>
                          <Var>R</Var> <Op>=</Op> <Frac num={<><Var>ρ</Var><Var>ℓ</Var></>} den="A" />
                        </div>
                        <div>
                          <Var>I</Var> <Op>=</Op> <Frac num="ΔV" den="R" />
                        </div>
                        <div>
                          <Var>P</Var> <Op>=</Op> <Var>I</Var><Var>ΔV</Var>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Circuits, Magnetism, Induction & Maxwell */}
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold text-sky-400 uppercase border-b border-white/10 pb-1">
                      Circuits, Magnetism, Induction &amp; Oscillations
                    </div>

                    {/* Circuit Combinations & RC Transients */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Resistor &amp; Capacitor Networks</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>R</Var><Sub>eq,s</Sub> <Op>=</Op> <BigSum /><Var>R</Var><Sub>i</Sub>
                        </div>
                        <div>
                          <Frac num="1" den={<><Var>R</Var><Sub>eq,p</Sub></>} /> <Op>=</Op> <BigSum /><Frac num="1" den={<><Var>R</Var><Sub>i</Sub></>} />
                        </div>
                        <div>
                          <Frac num="1" den={<><Var>C</Var><Sub>eq,s</Sub></>} /> <Op>=</Op> <BigSum /><Frac num="1" den={<><Var>C</Var><Sub>i</Sub></>} />
                        </div>
                        <div>
                          <Var>C</Var><Sub>eq,p</Sub> <Op>=</Op> <BigSum /><Var>C</Var><Sub>i</Sub>
                        </div>
                        <div>
                          <Var>τ</Var> <Op>=</Op> <Var>R</Var><Sub>eq</Sub><Var>C</Var><Sub>eq</Sub> <span className="text-[11px] font-sans text-slate-400 ml-2">(RC Time Constant)</span>
                        </div>
                      </div>
                    </div>

                    {/* Magnetic Fields, Lorentz Force & Ampere's Law */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Magnetic Fields &amp; Forces</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <BigContourInt /><Vec>B</Vec><Dot /><Var>d</Var><Vec>A</Vec> <Op>=</Op> 0 <span className="text-[11px] font-sans text-slate-400 ml-2">(Gauss for Magnetism)</span>
                        </div>
                        <div>
                          <Vec>F</Vec><Sub>B</Sub> <Op>=</Op> <Var>q</Var>(<Vec>v</Vec> <Cross /> <Vec>B</Vec>)
                        </div>
                        <div>
                          <Var>d</Var><Vec>B</Vec> <Op>=</Op> <Frac num={<><Var>μ</Var><Sub>0</Sub></>} den="4π" /> <Frac num={<><Var>I</Var>(<Var>d</Var><Vec>ℓ</Vec> <Cross /> <span className="font-serif not-italic">r̂</span>)</>} den={<><Var>r</Var><Sup>2</Sup></>} /> <span className="text-[11px] font-sans text-slate-400 ml-2">(Biot-Savart Law)</span>
                        </div>
                        <div>
                          <Vec>F</Vec><Sub>B</Sub> <Op>=</Op> <BigInt /><Var>I</Var>(<Var>d</Var><Vec>ℓ</Vec> <Cross /> <Vec>B</Vec>)
                        </div>
                        <div>
                          <BigContourInt /><Vec>B</Vec><Dot /><Var>d</Var><Vec>ℓ</Vec> <Op>=</Op> <Var>μ</Var><Sub>0</Sub><Var>I</Var><Sub>enc</Sub> <span className="text-[11px] font-sans text-slate-400 ml-2">(Ampère&apos;s Law)</span>
                        </div>
                        <div>
                          <Var>B</Var><Sub>sol</Sub> <Op>=</Op> <Var>μ</Var><Sub>0</Sub><Var>n</Var><Var>I</Var>
                        </div>
                      </div>
                    </div>

                    {/* Electromagnetic Induction & Faraday's Law */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Electromagnetic Induction (Faraday &amp; Lenz)</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>Φ</Var><Sub>B</Sub> <Op>=</Op> <BigInt /><Vec>B</Vec><Dot /><Var>d</Var><Vec>A</Vec>
                        </div>
                        <div>
                          <Var>ℰ</Var> <Op>=</Op> <BigContourInt /><Vec>E</Vec><Dot /><Var>d</Var><Vec>ℓ</Vec> <Op>=</Op> <Op>-</Op><Frac num={<><Var>dΦ</Var><Sub>B</Sub></>} den="dt" /> <span className="text-[11px] font-sans text-slate-400 ml-2">(Faraday&apos;s Law)</span>
                        </div>
                        <div>
                          |<Var>ℰ</Var><Sub>sol</Sub>| <Op>=</Op> <Var>N</Var> |<Frac num={<><Var>dΦ</Var><Sub>B</Sub></>} den="dt" />|
                        </div>
                      </div>
                    </div>

                    {/* Inductance, RL Circuits & LC Resonance */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 font-serif text-sm">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Inductance, Transients &amp; LC Resonance</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Var>L</Var><Sub>sol</Sub> <Op>=</Op> <Frac num={<><Var>μ</Var><Sub>core</Sub><Var>N</Var><Sup>2</Sup><Var>A</Var></>} den="ℓ" />
                        </div>
                        <div>
                          <Var>U</Var><Sub>L</Sub> <Op>=</Op> <Frac num="1" den="2" /><Var>L</Var><Var>I</Var><Sup>2</Sup>
                        </div>
                        <div>
                          <Var>ℰ</Var> <Op>=</Op> <Op>-</Op><Var>L</Var> <Frac num="dI" den="dt" />
                        </div>
                        <div>
                          <Var>τ</Var> <Op>=</Op> <Frac num="L" den={<><Var>R</Var><Sub>eq</Sub></>} /> <span className="text-[11px] font-sans text-slate-400 ml-2">(RL Time Constant)</span>
                        </div>
                        <div>
                          <Var>ω</Var><Sub>LC</Sub> <Op>=</Op> <Frac num="1" den={<span className="inline-flex items-center">√<span className="border-t border-current ml-0.5"><Var>LC</Var></span></span>} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Symbols Legend Box for E&M */}
                <div className="mt-5 pt-4 border-t border-white/10 text-xs">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Official Electricity &amp; Magnetism Variables &amp; Symbols Legend
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 font-mono">
                    <div><Var>A</Var> = area</div>
                    <div><Var>B</Var> = magnetic field</div>
                    <div><Var>C</Var> = capacitance</div>
                    <div><Var>d</Var> = distance</div>
                    <div><Var>E</Var> = electric field</div>
                    <div><Var>ℰ</Var> = electromotive force (emf)</div>
                    <div><Var>F</Var> = force</div>
                    <div><Var>I</Var> = current</div>
                    <div><Var>J</Var> = current density</div>
                    <div><Var>ℓ</Var> = length</div>
                    <div><Var>L</Var> = inductance</div>
                    <div><Var>n</Var> = loops per unit length</div>
                    <div><Var>N</Var> = number of loops</div>
                    <div><Var>P</Var> = power</div>
                    <div><Var>q</Var>, <Var>Q</Var> = electric charge</div>
                    <div><Var>r</Var> = radius, distance, or position</div>
                    <div><Var>R</Var> = resistance</div>
                    <div><Var>t</Var> = time</div>
                    <div><Var>U</Var> = potential energy</div>
                    <div><Var>v</Var> = velocity or speed</div>
                    <div><Var>V</Var> = electric potential or volume</div>
                    <div><Var>ε</Var> = electric permittivity</div>
                    <div><Var>κ</Var> = dielectric constant</div>
                    <div><Var>μ</Var> = magnetic permeability</div>
                    <div><Var>ρ</Var> = resistivity or charge density</div>
                    <div><Var>τ</Var> = time constant</div>
                    <div><Var>Φ</Var> = magnetic or electric flux</div>
                    <div><Var>ω</Var> = angular frequency</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GEOMETRY, TRIGONOMETRY, VECTORS & CALCULUS IDENTITIES */}
          {activeTab === 'geometry' && (
            <div className="space-y-6">
              <div className="border border-white/10 rounded-2xl p-4 bg-black/40 space-y-5">
                <div className="text-center font-bold text-sm tracking-wide text-white uppercase border-b border-white/10 pb-2">
                  GEOMETRY AND TRIGONOMETRY
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-serif">
                  {/* Rectangle & Solid */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Rectangles &amp; Solids</div>
                    <div>Rectangle: <Var>A</Var> <Op>=</Op> <Var>bh</Var></div>
                    <div>Rectangular Solid: <Var>V</Var> <Op>=</Op> <Var>ℓwh</Var></div>
                  </div>

                  {/* Triangle & Cylinder */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Triangles &amp; Cylinders</div>
                    <div>Triangle: <Var>A</Var> <Op>=</Op> <Frac num="1" den="2" /><Var>bh</Var></div>
                    <div>Cylinder: <Var>V</Var> <Op>=</Op> <Var>πr</Var><Sup>2</Sup><Var>ℓ</Var></div>
                    <div>Cylinder Surface: <Var>S</Var> <Op>=</Op> 2<Var>πrℓ</Var> <Op>+</Op> 2<Var>πr</Var><Sup>2</Sup></div>
                  </div>

                  {/* Circle & Sphere */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Circles &amp; Spheres</div>
                    <div>Circle: <Var>A</Var> <Op>=</Op> <Var>πr</Var><Sup>2</Sup>, <Var>C</Var> <Op>=</Op> 2<Var>πr</Var>, <Var>s</Var> <Op>=</Op> <Var>rθ</Var></div>
                    <div>Sphere: <Var>V</Var> <Op>=</Op> <Frac num="4" den="3" /><Var>πr</Var><Sup>3</Sup></div>
                    <div>Sphere Surface: <Var>S</Var> <Op>=</Op> 4<Var>πr</Var><Sup>2</Sup></div>
                    <div>Right Triangle: <Var>a</Var><Sup>2</Sup> <Op>+</Op> <Var>b</Var><Sup>2</Sup> <Op>=</Op> <Var>c</Var><Sup>2</Sup></div>
                    <div>sin <Var>θ</Var> <Op>=</Op> <Frac num="a" den="c" />, cos <Var>θ</Var> <Op>=</Op> <Frac num="b" den="c" />, tan <Var>θ</Var> <Op>=</Op> <Frac num="a" den="b" /></div>
                  </div>
                </div>

                {/* Vectors, Calculus & Identities */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/10 font-serif">
                  {/* Vectors Column */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                    <div className="text-xs font-mono font-bold text-amber-300 uppercase font-sans">VECTORS</div>
                    <div><Vec>A</Vec><Dot /><Vec>B</Vec> <Op>=</Op> <Var>AB</Var> cos <Var>θ</Var></div>
                    <div>|<Vec>A</Vec> <Cross /> <Vec>B</Vec>| <Op>=</Op> <Var>AB</Var> sin <Var>θ</Var></div>
                    <div><Vec>r</Vec> <Op>=</Op> (<Var>A</Var><span className="font-serif not-italic">î</span> <Op>+</Op> <Var>B</Var><span className="font-serif not-italic">ĵ</span> <Op>+</Op> <Var>C</Var><span className="font-serif not-italic">k̂</span>)</div>
                    <div><Vec>C</Vec> <Op>=</Op> <Vec>A</Vec> <Op>+</Op> <Vec>B</Vec></div>
                    <div><Vec>C</Vec> <Op>=</Op> (<Var>A</Var><Sub>x</Sub> <Op>+</Op> <Var>B</Var><Sub>x</Sub>)<span className="font-serif not-italic">î</span> <Op>+</Op> (<Var>A</Var><Sub>y</Sub> <Op>+</Op> <Var>B</Var><Sub>y</Sub>)<span className="font-serif not-italic">ĵ</span></div>
                  </div>

                  {/* Calculus Column */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                    <div className="text-xs font-mono font-bold text-amber-300 uppercase font-sans">CALCULUS</div>
                    <div><Frac num="df" den="dx" /> <Op>=</Op> <Frac num="df" den="du" /><Frac num="du" den="dx" /></div>
                    <div><Frac num="d" den="dx" />(<Var>x</Var><Sup>n</Sup>) <Op>=</Op> <Var>nx</Var><Sup>n-1</Sup></div>
                    <div><Frac num="d" den="dx" />(<Var>e</Var><Sup>ax</Sup>) <Op>=</Op> <Var>ae</Var><Sup>ax</Sup></div>
                    <div><Frac num="d" den="dx" />(ln <Var>ax</Var>) <Op>=</Op> <Frac num="1" den="x" /></div>
                    <div><Frac num="d" den="dx" />[sin(<Var>ax</Var>)] <Op>=</Op> <Var>a</Var> cos(<Var>ax</Var>)</div>
                    <div><Frac num="d" den="dx" />[cos(<Var>ax</Var>)] <Op>=</Op> <Op>-</Op><Var>a</Var> sin(<Var>ax</Var>)</div>
                    <div><BigInt /><Var>x</Var><Sup>n</Sup><Var>dx</Var> <Op>=</Op> <Frac num="1" den="n+1" /><Var>x</Var><Sup>n+1</Sup>, <Var>n</Var> ≠ -1</div>
                    <div><BigInt /><Var>e</Var><Sup>ax</Sup><Var>dx</Var> <Op>=</Op> <Frac num="1" den="a" /><Var>e</Var><Sup>ax</Sup></div>
                    <div><BigInt /><Frac num="dx" den={<><Var>x</Var> <Op>+</Op> <Var>a</Var></>} /> <Op>=</Op> ln|<Var>x</Var> <Op>+</Op> <Var>a</Var>|</div>
                    <div><BigInt />cos(<Var>ax</Var>)<Var>dx</Var> <Op>=</Op> <Frac num="1" den="a" />sin(<Var>ax</Var>)</div>
                    <div><BigInt />sin(<Var>ax</Var>)<Var>dx</Var> <Op>=</Op> <Op>-</Op><Frac num="1" den="a" />cos(<Var>ax</Var>)</div>
                  </div>

                  {/* Identities Column */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                    <div className="text-xs font-mono font-bold text-amber-300 uppercase font-sans">IDENTITIES</div>
                    <div>log(<Var>a</Var><Dot /><Var>b</Var><Sup>x</Sup>) <Op>=</Op> log <Var>a</Var> <Op>+</Op> <Var>x</Var> log <Var>b</Var></div>
                    <div>sin<Sup>2</Sup><Var>θ</Var> <Op>+</Op> cos<Sup>2</Sup><Var>θ</Var> <Op>=</Op> 1</div>
                    <div>sin(2<Var>θ</Var>) <Op>=</Op> 2 sin <Var>θ</Var> cos <Var>θ</Var></div>
                    <div><Frac num={<>sin <Var>θ</Var></>} den={<>cos <Var>θ</Var></>} /> <Op>=</Op> tan <Var>θ</Var></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isMechanics ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
            />
            <span>
              {isMechanics
                ? 'College Board AP Physics C: Mechanics Course and Exam Description Appendix'
                : 'College Board AP Physics C: Electricity and Magnetism Course and Exam Description Appendix'}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl text-slate-950 font-bold transition shadow-md ${
              isMechanics
                ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                : 'bg-sky-400 hover:bg-sky-300 shadow-sky-500/20'
            }`}
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
