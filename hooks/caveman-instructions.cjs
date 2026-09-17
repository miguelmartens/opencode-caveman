'use strict';

// caveman — shared instructions builder for the OpenCode plugin.
//
// The injected ruleset is the vendored caveman skill body filtered to the
// active level: only that level's intensity-table row and worked examples
// survive. Everything else in the skill is level-independent and kept
// verbatim.

const fs = require('fs');
const path = require('path');
const { DEFAULT_LEVEL, normalizeLevel } = require('./caveman-config.cjs');

const SKILL_PATH = path.join(__dirname, '..', 'skills', 'caveman', 'SKILL.md');

function filterSkillBodyForLevel(body, level) {
  const effectiveLevel = normalizeLevel(level) || DEFAULT_LEVEL;
  const withoutFrontmatter = String(body || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  // Only the intensity table rows and the worked examples are level-specific,
  // and both are keyed by a level name. A bullet whose label is not a level —
  // e.g. "Never drop not/never/no..." — is a normal rule and stays.
  return withoutFrontmatter
    .split(/\r?\n/)
    .filter((line) => {
      const tableLabel = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/);
      if (tableLabel) {
        const labelLevel = normalizeLevel(tableLabel[1].trim());
        if (labelLevel) return labelLevel === effectiveLevel;
      }

      // Require a quoted value: every worked example is `- lite: "..."`.
      // Without this, an ordinary rule bullet that happens to start with a
      // level word would be silently dropped in every other level.
      const exampleLabel = line.match(/^-\s*([^:]+):\s*"/);
      if (exampleLabel) {
        const labelLevel = normalizeLevel(exampleLabel[1].trim());
        if (labelLevel) return labelLevel === effectiveLevel;
      }

      return true;
    })
    .join('\n');
}

function getFallbackInstructions(level) {
  return (
    'CAVEMAN MODE ACTIVE — level: ' +
    level +
    '\n\n' +
    'Respond terse like smart caveman. All technical substance stay. Only fluff die.\n\n' +
    '## Persistence\n\n' +
    'Default style every response until user say "stop caveman" or "normal mode".\n\n' +
    '## Rules\n\n' +
    'Drop articles, filler, pleasantries, hedging. Fragments OK. Short synonyms. ' +
    'No tool-call narration. Technical terms, code, commands, and error strings exact and unchanged. ' +
    'Never drop not/never/no/only/except. Never invent abbreviations or arrows. ' +
    'Keep one idea per sentence, active voice, one term per thing.\n\n' +
    '## Auto-Clarity\n\n' +
    'Full sentences for security warnings, irreversible actions, and anything ambiguous under compression. Resume after.\n\n' +
    '## Boundaries\n\n' +
    'Code, commits, docs, and messages to other humans stay normal prose.'
  );
}

function getLevelInstructions(level) {
  const effectiveLevel = normalizeLevel(level) || DEFAULT_LEVEL;

  try {
    return (
      'CAVEMAN MODE ACTIVE — level: ' +
      effectiveLevel +
      '\n\n' +
      filterSkillBodyForLevel(fs.readFileSync(SKILL_PATH, 'utf8'), effectiveLevel)
    );
  } catch (e) {
    return getFallbackInstructions(effectiveLevel);
  }
}

module.exports = {
  filterSkillBodyForLevel,
  getFallbackInstructions,
  getLevelInstructions,
};
