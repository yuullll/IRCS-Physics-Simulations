import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SUBTOPIC_DISPLAY,
  getSubtopicDisplayMeta,
  getUnitHeroSummary,
  getUnitThemePalette,
  UNIT_HERO_SUMMARIES,
} from './unit-selection-data';

test('Mechanics and E&M themes provide distinct cohesive palettes for pages and top bars', () => {
  const mech = getUnitThemePalette('mechanics');
  const em = getUnitThemePalette('em');

  assert.notEqual(mech.canvasBg, em.canvasBg);
  assert.notEqual(mech.svgPrimaryStroke, em.svgPrimaryStroke);
  assert.notEqual(mech.topBarContainerClass, em.topBarContainerClass);
  assert.match(mech.eyebrow, /MECHANICS/);
  assert.match(em.eyebrow, /ELECTRICITY & MAGNETISM/);
});

test('UNIT_HERO_SUMMARIES provides concise 2-line summaries for all 13 AP Physics C units', () => {
  const expectedUnitIds = [
    'unit-1-kinematics',
    'unit-2-dynamics',
    'unit-3-work-energy',
    'unit-4-momentum',
    'unit-5-rotation',
    'unit-6-rotating-energy',
    'unit-7-oscillations',
    'unit-8-electrostatics',
    'unit-9-potential',
    'unit-10-capacitors',
    'unit-11-circuits',
    'unit-12-magnetism',
    'unit-13-induction',
  ];

  for (const id of expectedUnitIds) {
    const summary = UNIT_HERO_SUMMARIES[id];
    assert.ok(summary, `Missing summary for ${id}`);
    assert.ok(
      summary.length >= 90 && summary.length <= 185,
      `Summary length out of 2-line range for ${id}: ${summary.length}`
    );
  }

  assert.equal(getUnitHeroSummary('unknown-unit', 'Fallback summary.'), 'Fallback summary.');
});

test('ALL_SUBTOPIC_DISPLAY covers all 22 live simulations with concise single-sentence descriptions', () => {
  const expectedLiveIds = [
    'sub-1-1',
    'sub-1-2',
    'sub-1-3',
    'sub-1-4',
    'sub-1-5',
    'sub-2-1',
    'sub-2-2',
    'sub-2-3',
    'sub-2-4',
    'sub-2-5',
    'sub-2-6',
    'sub-2-7',
    'sub-2-8',
    'sub-2-9',
    'sub-2-10',
    'sub-8-1',
    'sub-8-2',
    'sub-8-3',
    'sub-8-4',
    'sub-8-5',
    'sub-8-6',
    'sub-11-summary',
  ];

  for (const id of expectedLiveIds) {
    const entry = ALL_SUBTOPIC_DISPLAY[id];
    assert.ok(entry, `Missing display entry for ${id}`);
    assert.ok(entry.title.length > 0 && entry.title.length <= 42, `Title too long for ${id}`);
    const sentences = entry.description.split('.').filter(s => s.trim().length > 0);
    assert.equal(sentences.length, 1, `Expected strictly 1 sentence for ${id}`);
    assert.equal(/\d+\.\d+\.[A-Z]/.test(entry.description), false, `AP code leaked into ${id}`);
  }

  const fallback = getSubtopicDisplayMeta('sub-99-1', '99.1', 'Fallback', 'One sentence.');
  assert.equal(fallback.title, 'Fallback');
});
