'use strict';

// caveman — shared configuration resolver.
//
// Default mode resolution order:
//   1. CAVEMAN_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $CAVEMAN_CONFIG_DIR/config.json (explicit override, used by tests)
//      - $XDG_CONFIG_HOME/caveman/config.json
//      - ~/.config/caveman/config.json (macOS / Linux)
//      - %APPDATA%\caveman\config.json (Windows fallback)
//   3. 'caveman'
//
// Modes: off, caveman, ultracave, megacave. Upstream's older level names still
// resolve, exactly as they do in Caveman 3.x: lite/full → caveman,
// ultra → ultracave, wenyan* → megacave.

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'caveman';
const MODES = ['off', 'caveman', 'ultracave', 'megacave'];

const LEGACY_MODES = {
  lite: 'caveman',
  full: 'caveman',
  ultra: 'ultracave',
  wenyan: 'megacave',
  'wenyan-lite': 'megacave',
  'wenyan-full': 'megacave',
  'wenyan-ultra': 'megacave',
};

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const normalized = mode.trim().toLowerCase();
  const resolved = LEGACY_MODES[normalized] || normalized;
  return MODES.includes(resolved) ? resolved : null;
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

function getDefaultMode() {
  const envMode = normalizeMode(process.env.CAVEMAN_DEFAULT_MODE);
  if (envMode) return envMode;

  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8').replace(/^\uFEFF/, ''));
    const configMode = normalizeMode(config.defaultMode);
    if (configMode) return configMode;
  } catch (e) {
    // Missing or invalid config — fall through.
  }

  return DEFAULT_MODE;
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

// Legacy level names written by older plugin versions still resolve here.
function readMode() {
  try {
    return normalizeMode(fs.readFileSync(getStatePath(), 'utf8')) || getDefaultMode();
  } catch (e) {
    return getDefaultMode();
  }
}

function writeMode(mode) {
  const normalized = normalizeMode(mode);
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
  DEFAULT_MODE,
  MODES,
  getConfigDir,
  getConfigPath,
  getDefaultMode,
  getStatePath,
  isDeactivationCommand,
  normalizeMode,
  readMode,
  writeMode,
};
