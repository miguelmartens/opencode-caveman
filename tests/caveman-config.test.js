'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getDefaultLevel,
  getStatePath,
  isDeactivationCommand,
  normalizeLevel,
  readLevel,
  writeLevel,
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

test('normalizeLevel accepts every level', () => {
  for (const level of [
    'off',
    'lite',
    'full',
    'ultra',
    'wenyan-lite',
    'wenyan-full',
    'wenyan-ultra',
  ]) {
    assert.equal(normalizeLevel(level), level);
  }
});

test('normalizeLevel trims, lowercases, and resolves the wenyan alias', () => {
  assert.equal(normalizeLevel('  ULTRA '), 'ultra');
  assert.equal(normalizeLevel('wenyan'), 'wenyan-full');
});

test('normalizeLevel rejects unknown and non-string input', () => {
  assert.equal(normalizeLevel('fast'), null);
  assert.equal(normalizeLevel(''), null);
  assert.equal(normalizeLevel(null), null);
  assert.equal(normalizeLevel(42), null);
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

test('getDefaultLevel falls back to full when nothing is configured', () => {
  assert.equal(getDefaultLevel(), 'full');
});

test('getDefaultLevel reads defaultMode from the config file', () => {
  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'lite' }),
  );
  assert.equal(getDefaultLevel(), 'lite');
});

test('environment variable outranks the config file', () => {
  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'lite' }),
  );
  process.env.CAVEMAN_DEFAULT_MODE = 'ultra';
  assert.equal(getDefaultLevel(), 'ultra');
});

test('invalid env value and invalid config file fall back to full', () => {
  process.env.CAVEMAN_DEFAULT_MODE = 'nope';
  assert.equal(getDefaultLevel(), 'full');

  fs.writeFileSync(path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'), '{ not json');
  delete process.env.CAVEMAN_DEFAULT_MODE;
  assert.equal(getDefaultLevel(), 'full');
});

test('config file defaultMode accepts the wenyan alias and rejects unknown levels', () => {
  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'wenyan' }),
  );
  assert.equal(getDefaultLevel(), 'wenyan-full');

  fs.writeFileSync(
    path.join(process.env.CAVEMAN_CONFIG_DIR, 'config.json'),
    JSON.stringify({ defaultMode: 'fast' }),
  );
  assert.equal(getDefaultLevel(), 'full');
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

test('writeLevel and readLevel round-trip through the state file', () => {
  assert.equal(writeLevel('ultra'), 'ultra');
  assert.equal(
    fs.readFileSync(path.join(process.env.XDG_CONFIG_HOME, 'opencode', '.caveman-active'), 'utf8'),
    'ultra',
  );
  assert.equal(readLevel(), 'ultra');

  writeLevel('off');
  assert.equal(readLevel(), 'off');
});

test('writeLevel rejects unknown levels without touching the state file', () => {
  writeLevel('lite');
  assert.equal(writeLevel('bogus'), null);
  assert.equal(readLevel(), 'lite');
});

test('readLevel falls back to the default level when no state exists', () => {
  process.env.CAVEMAN_DEFAULT_MODE = 'wenyan-lite';
  assert.equal(readLevel(), 'wenyan-lite');
});
