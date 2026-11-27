'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { PhysicsModelSlot, PhysicsUnitModule } from '@/components/catalog/ModelCatalogPortal';
import {
  getSubtopicDisplayMeta,
  getUnitHeroSummary,
  getUnitThemePalette,
  type UnitThemeVariant,
} from '@/lib/ui/unit-selection-data';
import {
  UnitHeroLawFormula,
  UnitSubtopicEquation,
} from '@/components/catalog/unit-selection/UnitSelectionEquations';
import { UnitPhysicsDiagram } from '@/components/catalog/unit-selection/UnitPhysicsDiagrams';
import { Unit1SpotlightCard } from '@/components/catalog/unit1/Unit1SpotlightCard';

interface UnitModelSelectionViewProps {
  unit: PhysicsUnitModule;
  onBack: () => void;
  onSelectModel: (sim: PhysicsModelSlot) => void;
}

export const UnitModelSelectionView: React.FC<UnitModelSelectionViewProps> = ({
  unit,
  onBack,
  onSelectModel,
}) => {
  const course: UnitThemeVariant = unit.course === 'mechanics' ? 'mechanics' : 'em';
  const palette = getUnitThemePalette(course);

  const regularSubtopics = unit.subtopics.filter(s => !s.isSummaryBlock);
  const summaryBlocks = unit.subtopics.filter(s => s.isSummaryBlock);
  const heroSummary = getUnitHeroSummary(unit.id, unit.intro);

  const subtopicCountLabel =
    summaryBlocks.length > 0
      ? `${regularSubtopics.length} Subtopics · ${summaryBlocks.length} Summary`
      : `${regularSubtopics.length} Subtopics Available`;

  return (
    <div
      data-testid={`unit-model-selection-${unit.unitNumber}`}
      data-unit-course={course}
      className="relative min-h-full font-[family-name:var(--font-jakarta),system-ui,sans-serif] text-slate-100"
    >
      {/* Subtle ambient course-matched atmospheric lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: palette.canvasGlow }}
      />

      <div className="relative z-10 max-w-[1260px] mx-auto space-y-7">
        {/* ================================================================= */}
        {/* UNIT HERO OVERVIEW CARD                                           */}
        {/* ================================================================= */}
        <Unit1SpotlightCard
          as="section"
          theme={course}
          aria-label={`${unit.title} overview`}
          data-testid={`unit-hero-card-${unit.unitNumber}`}
          spotlightRadius={560}
          className="px-6 py-6 sm:px-9 sm:py-7"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-slate-700/40">
            <div className="space-y-2 max-w-2xl">
              <div className="font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">
                {palette.eyebrow}
              </div>
              <h1 className="text-3xl sm:text-[2.15rem] font-bold tracking-[-0.015em] text-white leading-[1.18]">
                {unit.title}
              </h1>
              <p className="text-[14px] sm:text-[14.5px] text-slate-300/85 leading-[1.6] tracking-[0.005em] max-w-[62ch]">
                {heroSummary}
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/90 border border-slate-700/60 ${palette.cardBorderHoverClass} text-slate-200 hover:text-white text-xs font-medium tracking-[0.01em] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${palette.cardFocusRingClass}`}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>Back to Unit Selection</span>
              </button>
            </div>
          </div>

          {/* Bottom Fundamental Law + Subtopic Count Row */}
          <div className="pt-4.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center flex-wrap gap-3">
              <span className="font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] uppercase tracking-[0.12em] text-slate-400">
                FUNDAMENTAL UNIT LAW:
              </span>
              <UnitHeroLawFormula unitId={unit.id} fallbackEquation={unit.equation} />
            </div>

            <span
              className={`inline-flex items-center px-3.5 py-1.5 rounded-full border text-xs font-medium tracking-[0.01em] ${palette.accentPillClass}`}
            >
              {subtopicCountLabel}
            </span>
          </div>
        </Unit1SpotlightCard>

        {/* ================================================================= */}
        {/* SUBTOPIC CARD GRID (3-COLUMN RESPONSIVE)                          */}
        {/* ================================================================= */}
        <section aria-label={`${unit.code} subtopics and simulations`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularSubtopics.map(sub => {
              const sim = sub.simulation;
              const isUnnamedPlaceholder = sub.title === 'Under Development';

              if (sim) {
                const display = getSubtopicDisplayMeta(
                  sub.id,
                  sub.code,
                  sim.title,
                  sim.description
                );

                return (
                  <Unit1SpotlightCard
                    key={sub.id}
                    as="button"
                    theme={course}
                    enableTilt
                    maxTiltDeg={1.2}
                    spotlightRadius={380}
                    data-testid={`unit-card-${sub.code}`}
                    aria-label={`Subtopic ${sub.code}: ${display.title} — Launch 3D Simulation`}
                    onClick={() => onSelectModel(sim)}
                    className="p-6 min-h-[276px]"
                  >
                    <div className="space-y-4">
                      {/* Header Row: SUBTOPIC X.Y + LIVE 3D SIMULATION pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 group-hover:text-slate-300 transition-colors">
                          SUBTOPIC {sub.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[10px] font-semibold uppercase tracking-[0.06em] ${palette.accentPillClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${palette.accentDotClass}`}
                            aria-hidden="true"
                          />
                          LIVE 3D SIMULATION
                        </span>
                      </div>

                      {/* Clean Scannable Title */}
                      <h2 className="text-[1.14rem] font-semibold tracking-[-0.01em] text-white transition-colors leading-snug">
                        {display.title}
                      </h2>

                      {/* Visual / Formula Split Row */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div
                          className={`min-w-0 flex-1 rounded-xl border px-3 py-3 min-h-[76px] flex items-center justify-center transition-colors duration-200 overflow-x-auto ${palette.eqBoxClass}`}
                        >
                          <UnitSubtopicEquation
                            subtopicId={sub.id}
                            course={course}
                            fallbackEquation={sim.equation}
                          />
                        </div>

                        <UnitPhysicsDiagram
                          subtopicId={sub.id}
                          course={course}
                          label={display.diagramLabel}
                        />
                      </div>

                      {/* Strictly One Concise Sentence Description */}
                      <p className="text-[13.5px] text-slate-300/80 leading-[1.58] tracking-[0.005em] pt-0.5">
                        {display.description}
                      </p>
                    </div>

                    {/* Clean Footer CTA */}
                    <div className="pt-4 mt-5 border-t border-slate-700/40 flex items-center justify-between">
                      <span
                        className={`text-[13.5px] font-medium tracking-[0.005em] transition-colors ${palette.accentTextClass} ${palette.accentTextHoverClass}`}
                      >
                        Launch 3D Simulation
                      </span>
                      <ArrowRight
                        className={`w-4 h-4 opacity-90 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transform-none ${palette.accentTextClass} ${palette.accentTextHoverClass}`}
                        aria-hidden="true"
                      />
                    </div>
                  </Unit1SpotlightCard>
                );
              }

              // Under Development Block (kept clean & minimal without extra additions)
              return (
                <div
                  key={sub.id}
                  data-testid={`unit-card-dev-${sub.code}`}
                  className={`rounded-2xl p-6 min-h-[212px] flex flex-col justify-between border border-dashed border-slate-700/45 ${
                    course === 'mechanics' ? 'bg-[#091316]/65' : 'bg-[#0a1222]/65'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] uppercase tracking-[0.12em] text-slate-500">
                      <span>
                        {isUnnamedPlaceholder ? `BLOCK ${sub.code}` : `SUBTOPIC ${sub.code}`}
                      </span>
                      <span>UNDER DEVELOPMENT</span>
                    </div>

                    <h2 className="text-[1.05rem] font-semibold tracking-[-0.01em] text-slate-300 leading-snug">
                      {sub.title}
                    </h2>

                    <div
                      className={`px-4 py-3.5 rounded-xl border border-slate-800/70 text-center ${
                        course === 'mechanics' ? 'bg-[#060d10]/70' : 'bg-[#070d1a]/70'
                      }`}
                    >
                      <span className="font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-xs text-slate-400">
                        Under Development
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-5 border-t border-slate-800/70 flex items-center justify-between font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] text-slate-500">
                    <span>Simulation Slot</span>
                    <span>Under Development</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* UNIT SYNTHESIS WORKBENCH / SUMMARY BLOCK (E.G., UNIT 11 SUMMARY)  */}
        {/* ================================================================= */}
        {summaryBlocks.length > 0 && (
          <section aria-label={`${unit.code} synthesis workbench`} className="space-y-4 pt-2">
            <div className="flex items-baseline justify-between border-b border-slate-700/40 pb-3">
              <div>
                <div
                  className={`font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] uppercase tracking-[0.15em] ${palette.accentTextClass}`}
                >
                  UNIT SYNTHESIS WORKBENCH
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.012em] text-white mt-0.5">
                  {unit.code} Summary
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {summaryBlocks.map(summaryItem => {
                const sim = summaryItem.simulation;
                if (!sim) return null;

                const display = getSubtopicDisplayMeta(
                  summaryItem.id,
                  summaryItem.code,
                  sim.title,
                  sim.description
                );

                return (
                  <Unit1SpotlightCard
                    key={summaryItem.id}
                    as="button"
                    theme={course}
                    enableTilt
                    maxTiltDeg={1.1}
                    spotlightRadius={440}
                    data-testid={`unit-summary-card-${unit.unitNumber}`}
                    aria-label={`${summaryItem.title}: ${display.title} — Launch 3D Circuit Workbench`}
                    onClick={() => onSelectModel(sim)}
                    className="p-6 min-h-[268px]"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 group-hover:text-slate-300 transition-colors">
                          {summaryItem.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-[family-name:var(--font-jetbrains),ui-monospace,monospace] text-[10px] font-semibold uppercase tracking-[0.06em] ${palette.accentPillClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${palette.accentDotClass}`}
                            aria-hidden="true"
                          />
                          LIVE 3D SIMULATION
                        </span>
                      </div>

                      <h3 className="text-[1.18rem] font-semibold tracking-[-0.01em] text-white leading-snug">
                        {display.title}
                      </h3>

                      <div className="flex items-center justify-between gap-4 pt-0.5">
                        <div
                          className={`min-w-0 flex-1 rounded-xl border px-3.5 py-3 min-h-[76px] flex items-center justify-center transition-colors duration-200 overflow-x-auto ${palette.eqBoxClass}`}
                        >
                          <UnitSubtopicEquation
                            subtopicId={summaryItem.id}
                            course={course}
                            fallbackEquation={sim.equation}
                          />
                        </div>

                        <UnitPhysicsDiagram
                          subtopicId={summaryItem.id}
                          course={course}
                          label={display.diagramLabel}
                        />
                      </div>

                      <p className="text-[13.5px] text-slate-300/80 leading-[1.58] tracking-[0.005em] pt-0.5">
                        {display.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-700/40 flex items-center justify-between">
                      <span
                        className={`text-[13.5px] font-medium tracking-[0.005em] transition-colors ${palette.accentTextClass} ${palette.accentTextHoverClass}`}
                      >
                        Launch 3D Circuit Workbench
                      </span>
                      <ArrowRight
                        className={`w-4 h-4 opacity-90 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transform-none ${palette.accentTextClass} ${palette.accentTextHoverClass}`}
                        aria-hidden="true"
                      />
                    </div>
                  </Unit1SpotlightCard>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
