'use strict';

// caveman — shared instructions builder for the OpenCode plugin.
//
// The injected ruleset is the active mode's vendored skill, loaded whole with
// frontmatter stripped, under the same `CAVEMAN MODE ACTIVE — mode: <mode>`
// banner upstream's hooks use. Modes: caveman, ultracave, megacave; `off`
// injects nothing.

const fs = require('fs');
const path = require('path');
const { DEFAULT_MODE, normalizeMode } = require('./caveman-config.cjs');

const SKILL_DIR = path.join(__dirname, '..', 'skills');
const RULESET_MODES = ['caveman', 'ultracave', 'megacave'];

// Thesis line per mode, used only when the vendored skill file is unreadable.
const FALLBACK_THESIS = {
  caveman: 'Respond terse like smart caveman. All technical substance stay. Only fluff die.',
  ultracave:
    'Respond terse like smart caveman. All technical substance stay. Only fluff die. Then cut again.',
  megacave: '以文言答。技術之實皆存，唯贅言去之。',
};

function stripFrontmatter(body) {
  return String(body || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function rulesetBanner(mode) {
  return 'CAVEMAN MODE ACTIVE — mode: ' + mode;
}

// Returns null for `off` and unknown modes: nothing to inject.
function getModeInstructions(mode) {
  const effectiveMode = normalizeMode(mode) || DEFAULT_MODE;
  if (!RULESET_MODES.includes(effectiveMode)) return null;

  try {
    const body = stripFrontmatter(
      fs.readFileSync(path.join(SKILL_DIR, effectiveMode, 'SKILL.md'), 'utf8'),
    ).trim();
    return rulesetBanner(effectiveMode) + '\n\n' + body;
  } catch (e) {
    return getFallbackInstructions(effectiveMode);
  }
}

function getFallbackInstructions(mode) {
  const effectiveMode = normalizeMode(mode) || DEFAULT_MODE;
  const thesis = FALLBACK_THESIS[effectiveMode];
  if (!thesis) return null;
  return rulesetBanner(effectiveMode) + '\n\n' + thesis;
}

module.exports = {
  getFallbackInstructions,
  getModeInstructions,
  rulesetBanner,
  stripFrontmatter,
};
