'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getFallbackInstructions,
  getModeInstructions,
  rulesetBanner,
  stripFrontmatter,
} = require('../hooks/caveman-instructions.cjs');

test('instructions carry the active mode banner and the whole skill body', () => {
  const output = getModeInstructions('caveman');
  assert.match(output, /^CAVEMAN MODE ACTIVE — mode: caveman/);
  assert.ok(output.includes('Respond terse like smart caveman'));
  assert.ok(output.includes('## Rules'));
  assert.ok(!output.includes('Then cut again'), 'no other mode body leaks in');
  assert.ok(!output.includes('name: caveman'), 'frontmatter stripped');
});

test('ultracave and megacave inject their own skill bodies', () => {
  const ultracave = getModeInstructions('ultracave');
  assert.match(ultracave, /^CAVEMAN MODE ACTIVE — mode: ultracave/);
  assert.ok(ultracave.includes('Then cut again'));
  assert.ok(!ultracave.includes('Caveman is a voice'), 'no other mode body leaks in');

  const megacave = getModeInstructions('megacave');
  assert.match(megacave, /^CAVEMAN MODE ACTIVE — mode: megacave/);
  assert.ok(megacave.includes('文言'));
});

test('legacy level names resolve to their mode', () => {
  assert.match(getModeInstructions('ultra'), /^CAVEMAN MODE ACTIVE — mode: ultracave/);
  assert.match(getModeInstructions('wenyan'), /^CAVEMAN MODE ACTIVE — mode: megacave/);
  assert.match(getModeInstructions('full'), /^CAVEMAN MODE ACTIVE — mode: caveman/);
});

test('off injects nothing; unknown modes fall back to the default', () => {
  assert.equal(getModeInstructions('off'), null);
  assert.match(getModeInstructions('fast'), /^CAVEMAN MODE ACTIVE — mode: caveman/);
});

test('fallback instructions name the mode and stay in its register', () => {
  assert.match(
    getFallbackInstructions('ultracave'),
    /^CAVEMAN MODE ACTIVE — mode: ultracave\n\nRespond terse like smart caveman\. All technical substance stay\. Only fluff die\. Then cut again\.$/,
  );
  assert.ok(getFallbackInstructions('megacave').includes('文言'));
  assert.equal(getFallbackInstructions('off'), null);
});

test('stripFrontmatter removes the frontmatter block and keeps the body', () => {
  assert.equal(stripFrontmatter('---\nname: x\ndescription: y\n---\nBody\n').trim(), 'Body');
  assert.equal(stripFrontmatter('Body only'), 'Body only');
});

test('rulesetBanner labels the mode', () => {
  assert.equal(rulesetBanner('megacave'), 'CAVEMAN MODE ACTIVE — mode: megacave');
});
