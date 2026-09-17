'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterSkillBodyForLevel,
  getFallbackInstructions,
  getLevelInstructions,
} = require('../hooks/caveman-instructions.cjs');

test('instructions carry the active level header and only its intensity row', () => {
  const output = getLevelInstructions('full');
  assert.match(output, /^CAVEMAN MODE ACTIVE — level: full/);
  assert.ok(output.includes('| **full** |'));
  assert.ok(!output.includes('| **lite** |'));
  assert.ok(!output.includes('| **ultra** |'));
});

test('instructions keep only the active level worked examples', () => {
  assert.ok(getLevelInstructions('lite').includes('- lite: "'));
  assert.ok(!getLevelInstructions('lite').includes('- full: "'));

  const full = getLevelInstructions('full');
  assert.ok(full.includes('- full: "'));
  assert.ok(!full.includes('- lite: "'));
  assert.ok(!full.includes('- ultra: "'));
});

test('the wenyan alias resolves to the wenyan-full level', () => {
  const output = getLevelInstructions('wenyan');
  assert.match(output, /^CAVEMAN MODE ACTIVE — level: wenyan-full/);
  assert.ok(output.includes('- wenyan-full: "'));
  assert.ok(!output.includes('- wenyan-lite: "'));
});

test('level-independent rules survive every level', () => {
  for (const level of ['lite', 'full', 'ultra', 'wenyan-full']) {
    const output = getLevelInstructions(level);
    assert.ok(output.includes('## Auto-Clarity'), level + ' keeps Auto-Clarity');
    assert.ok(
      output.includes('Never drop not/never/no/only/except'),
      level + ' keeps the negation rule',
    );
    assert.ok(output.includes('## Boundaries'), level + ' keeps Boundaries');
    assert.ok(!output.includes('name: caveman'), level + ' strips frontmatter');
  }
});

test('unquoted rule bullets that start with a level word are never filtered', () => {
  const body = [
    '---',
    'name: fixture',
    '---',
    '',
    '| Level | What change |',
    '|-------|------------|',
    '| **lite** | keep me |',
    '| **full** | drop me at lite |',
    '',
    '- Full: this is an ordinary rule, not an example',
    '- lite: "quoted example"',
    '- full: "other example"',
  ].join('\n');

  const output = filterSkillBodyForLevel(body, 'lite');
  assert.ok(output.includes('| **lite** |'));
  assert.ok(!output.includes('| **full** |'));
  assert.ok(output.includes('- Full: this is an ordinary rule, not an example'));
  assert.ok(output.includes('- lite: "quoted example"'));
  assert.ok(!output.includes('- full: "other example"'));
});

test('fallback instructions name the level and stay in the caveman register', () => {
  const output = getFallbackInstructions('ultra');
  assert.match(output, /^CAVEMAN MODE ACTIVE — level: ultra/);
  assert.ok(output.includes('Auto-Clarity'));
});
