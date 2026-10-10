'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getDefaultMode,
  getStatePath,
  isDeactivationCommand,
  normalizeMode,
  readMode,
  writeMode,
} = require('../hooks/caveman-config.cjs');

const ENV_KEYS = [
  'CAVEMAN_DEFAULT_MODE',
  'CAVEMAN_CONFIG_DIR',
  'OPENCODE_CONFIG_DIR',
  'XDG_CONFIG_HOME',
];
let savedEnv;

test.beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.CAVEMAN_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-cfg-'));
  process.env.XDG_CONFIG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-xdg-'));
});

test.afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

test('normalizeMode accepts every mode', () => {
  for (const mode of ['off', 'caveman', 'ultracave', 'megacave']) {
    assert.equal(normalizeMode(mode), mode);
  }
});

test('normalizeMode trims, lowercases, and resolves legacy level names', () => {
  assert.equal(normalizeMode('  ULTRACAVE '), 'ultracave');
  assert.equal(normalizeMode('lite'), 'caveman');
  assert.equal(normalizeMode('full'), 'caveman');
  assert.equal(normalizeMode('ultra'), 'ultracave');
  assert.equal(normalizeMode('wenyan'), 'megacave');
  assert.equal(normalizeMode('wenyan-lite'), 'megacave');
  assert.equal(normalizeMode('wenyan-full'), 'megacave');
  assert.equal(normalizeMode('wenyan-ultra'), 'megacave');
});

test('normalizeMode rejects unknown and non-string input', () => {
  assert.equal(normalizeMode('fast'), null);
  assert.equal(normalizeMode(''), null);
  assert.equal(normalizeMode(null), null);
  assert.equal(normalizeMode(42), null);
});

test('isDeactivationCommand matches only standalone commands', () => {
  assert.equal(isDeactivationCommand('stop caveman'), true);
  assert.equal(isDeactivationCommand('Stop Caveman.'), true);
  assert.equal(isDeactivationCommand('  normal mode!  '), true);
  assert.equal(isDeactivationCommand('add a normal mode toggle'), false);
  assert.equal(isDeactivationCommand('stop caveman now'), false);
  assert.equal(isDeactivationCommand('please stop caveman'), false);
  assert.equal(isDeactivationCommand(''), false);
  assert.equal(isDeactivationCommand(undefined), false);
});

test('getDefaultMode falls back to caveman when nothing is configured', () => {
  assert.equal(getDefaultMode(), 'caveman');
});

test('getDefaultMode reads defaultMode from the config file', () => {
  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'ultracave' }),
  );
  assert.equal(getDefaultMode(), 'ultracave');
});

test('environment variable outranks the config file', () => {
  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'caveman' }),
  );
  process.env.CAVEMAN_DEFAULT_MODE = 'megacave';
  assert.equal(getDefaultMode(), 'megacave');
});

test('invalid env value and invalid config file fall back to caveman', () => {
  process.env.CAVEMAN_DEFAULT_MODE = 'nope';
  assert.equal(getDefaultMode(), 'caveman');

  fs.writeFileSync(path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'), '{ not json');
  delete process.env.CAVEMAN_DEFAULT_MODE;
  assert.equal(getDefaultMode(), 'caveman');
});

test('config file defaultMode accepts legacy names and rejects unknown modes', () => {
  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'wenyan' }),
  );
  assert.equal(getDefaultMode(), 'megacave');

  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'fast' }),
  );
  assert.equal(getDefaultMode(), 'caveman');
});

test('state file lives beside the opencode config and honors OPENCODE_CONFIG_DIR', () => {
  assert.equal(
    getStatePath(),
    path.join(process.env.XDG_CONFIG_HOME, 'opencode', '.caveman-active'),
  );

  const override = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-opencode-'));
  process.env.OPENCODE_CONFIG_DIR = override;
  assert.equal(getStatePath(), path.join(override, '.caveman-active'));
});

test('writeMode and readMode round-trip through the state file', () => {
  assert.equal(writeMode('ultracave'), 'ultracave');
  assert.equal(
    fs.readFileSync(path.join(process.env.XDG_CONFIG_HOME, 'opencode', '.caveman-active'), 'utf8'),
    'ultracave',
  );
  assert.equal(readMode(), 'ultracave');

  writeMode('off');
  assert.equal(readMode(), 'off');
});

test('writeMode rejects unknown modes without touching the state file', () => {
  writeMode('caveman');
  assert.equal(writeMode('bogus'), null);
  assert.equal(readMode(), 'caveman');
});

test('readMode resolves legacy level names left by older plugin versions', () => {
  const statePath = path.join(process.env.XDG_CONFIG_HOME, 'opencode', '.caveman-active');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, 'ultra');
  assert.equal(readMode(), 'ultracave');

  fs.writeFileSync(statePath, 'wenyan-lite');
  assert.equal(readMode(), 'megacave');
});

test('readMode falls back to the default mode when no state exists', () => {
  process.env.CAVEMAN_DEFAULT_MODE = 'wenyan-lite';
  assert.equal(readMode(), 'megacave');
});
