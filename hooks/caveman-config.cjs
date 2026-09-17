'use strict';

// caveman — shared configuration resolver.
//
// Default level resolution order:
//   1. CAVEMAN_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $CAVEMAN_CONFIG_DIR/config.json (explicit override, used by tests)
//      - $XDG_CONFIG_HOME/caveman/config.json
//      - ~/.config/caveman/config.json (macOS / Linux)
//      - %APPDATA%\caveman\config.json (Windows fallback)
//   3. 'full'

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_LEVEL = 'full';
const LEVELS = ['off', 'lite', 'full', 'ultra', 'wenyan-lite', 'wenyan-full', 'wenyan-ultra'];

// Upstream trigger `/caveman wenyan` means the full wenyan register.
const ALIASES = { wenyan: 'wenyan-full' };

function normalizeLevel(level) {
  if (typeof level !== 'string') return null;
  const normalized = level.trim().toLowerCase();
  const resolved = ALIASES[normalized] || normalized;
  return LEVELS.includes(resolved) ? resolved : null;
}

function getConfigDir() {
  if (process.env.CAVEMAN_CONFIG_DIR) return process.env.CAVEMAN_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'caveman');
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'caveman',
    );
  }
  return path.join(os.homedir(), '.config', 'caveman');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getDefaultLevel() {
  const envLevel = normalizeLevel(process.env.CAVEMAN_DEFAULT_MODE);
  if (envLevel) return envLevel;

  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8').replace(/^\uFEFF/, ''));
    const configLevel = normalizeLevel(config.defaultMode);
    if (configLevel) return configLevel;
  } catch (e) {
    // Missing or invalid config — fall through.
  }

  return DEFAULT_LEVEL;
}

// OpenCode has no flag-file convention of its own; keep mode beside its config.
function getStatePath() {
  const configDir =
    process.env.OPENCODE_CONFIG_DIR ||
    (process.env.XDG_CONFIG_HOME ? path.join(process.env.XDG_CONFIG_HOME, 'opencode') : null) ||
    (process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'opencode')
      : path.join(os.homedir(), '.config', 'opencode'));
  return path.join(configDir, '.caveman-active');
}

function readLevel() {
  try {
    return normalizeLevel(fs.readFileSync(getStatePath(), 'utf8')) || getDefaultLevel();
  } catch (e) {
    return getDefaultLevel();
  }
}

function writeLevel(level) {
  const normalized = normalizeLevel(level);
  if (!normalized) return null;
  const statePath = getStatePath();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, normalized);
  return normalized;
}

// "stop caveman" / "normal mode" turn caveman off, but only as a standalone
// command. Matching the phrase anywhere in the message turned it off mid-task
// for ordinary requests like "add a normal mode toggle" — so require the whole
// message to be the command, ignoring case and trailing punctuation.
function isDeactivationCommand(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[.!?\s]+$/, '');
  return t === 'stop caveman' || t === 'normal mode';
}

module.exports = {
  DEFAULT_LEVEL,
  LEVELS,
  getConfigDir,
  getConfigPath,
  getDefaultLevel,
  getStatePath,
  isDeactivationCommand,
  normalizeLevel,
  readLevel,
  writeLevel,
};
