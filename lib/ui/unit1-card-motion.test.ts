import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCursorCardMetrics,
  getRestingCardMetrics,
  getUnit1SubtopicMeta,
  UNIT1_HERO_SUMMARY,
  UNIT1_SUBTOPIC_DISPLAY,
} from './unit1-card-motion';

test('computeCursorCardMetrics maps center of card to zero normalized offset', () => {
  const rect = { left: 100, top: 200, width: 400, height: 240 };
  const metrics = computeCursorCardMetrics(300, 320, rect);

  assert.equal(metrics.spotX, 200);
  assert.equal(metrics.spotY, 120);
  assert.equal(metrics.normX, 0);
  assert.equal(metrics.normY, 0);
  assert.equal(metrics.tiltX, 0);
  assert.equal(metrics.tiltY, 0);
  assert.equal(metrics.active, 1);
});

test('computeCursorCardMetrics clamps out-of-bounds pointer positions cleanly', () => {
  const rect = { left: 50, top: 80, width: 300, height: 200 };
  const topLeft = computeCursorCardMetrics(-200, -100, rect, { maxTiltDeg: 1.5 });
  const bottomRight = computeCursorCardMetrics(900, 900, rect, { maxTiltDeg: 1.5 });

  assert.equal(topLeft.spotX, 0);
  assert.equal(topLeft.spotY, 0);
  assert.equal(topLeft.normX, -1);
  assert.equal(topLeft.normY, -1);
  assert.equal(topLeft.tiltX, 1.5);
  assert.equal(topLeft.tiltY, -1.5);

  assert.equal(bottomRight.spotX, 300);
  assert.equal(bottomRight.spotY, 200);
  assert.equal(bottomRight.normX, 1);
  assert.equal(bottomRight.normY, 1);
  assert.equal(bottomRight.tiltX, -1.5);
  assert.equal(bottomRight.tiltY, 1.5);
});

test('computeCursorCardMetrics suppresses motion when reducedMotion is enabled or rect is invalid', () => {
  const rect = { left: 0, top: 0, width: 320, height: 200 };
  const reduced = computeCursorCardMetrics(280, 40, rect, { reducedMotion: true });
  assert.equal(reduced.active, 0);
  assert.equal(reduced.normX, 0);
  assert.equal(reduced.normY, 0);
  assert.equal(reduced.tiltX, 0);
  assert.equal(reduced.tiltY, 0);

  const degenerate = computeCursorCardMetrics(50, 50, { left: 0, top: 0, width: 0, height: 0 });
  assert.deepEqual(degenerate, getRestingCardMetrics());
});

test('UNIT1_SUBTOPIC_DISPLAY covers all 5 Unit 1 subtopics with concise single-sentence copy', () => {
  const expectedIds = ['sub-1-1', 'sub-1-2', 'sub-1-3', 'sub-1-4', 'sub-1-5'];
  for (const id of expectedIds) {
    const entry = UNIT1_SUBTOPIC_DISPLAY[id];
    assert.ok(entry, `Missing display metadata for ${id}`);
    assert.ok(entry.title.length > 0 && entry.title.length <= 42);
    // Single concise sentence ending with a period and no AP curriculum codes like "1.2.A.1"
    const sentenceCount = entry.description.split('.').filter(part => part.trim().length > 0).length;
    assert.equal(sentenceCount, 1, `Expected single sentence for ${id}`);
    assert.equal(/\d+\.\d+\.[A-Z]/.test(entry.description), false, `Found AP code in ${id}`);
  }

  assert.ok(UNIT1_HERO_SUMMARY.length >= 60 && UNIT1_HERO_SUMMARY.length <= 185);
});

test('getUnit1SubtopicMeta falls back cleanly for unknown IDs', () => {
  const fallback = getUnit1SubtopicMeta('sub-1-99', '1.99', 'Custom Lab', 'Explore motion.');
  assert.equal(fallback.title, 'Custom Lab');
  assert.equal(fallback.description, 'Explore motion.');
  assert.equal(fallback.code, '1.99');
});
