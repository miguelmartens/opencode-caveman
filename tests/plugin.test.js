'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readLevel, writeLevel } = require('../hooks/caveman-config.cjs');

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

async function loadPlugin() {
  const module = await import('../.opencode/plugins/caveman.mjs');
  return module;
}

test('the plugin module has exactly one export so the legacy loader stays quiet', async () => {
  const module = await loadPlugin();
  assert.deepEqual(Object.keys(module), ['default']);
  assert.equal(typeof module.default, 'function');
});

test('config hook registers commands, skills, and cavecrew subagents', async () => {
  const { default: plugin } = await loadPlugin();
  const hooks = await plugin({});
  const config = {};
  await hooks.config(config);

  for (const name of ['caveman', 'caveman-commit', 'caveman-review', 'caveman-help']) {
    assert.ok(config.command[name], 'command ' + name + ' registered');
    assert.ok(config.command[name].template.length > 0, 'command ' + name + ' has a template');
    assert.ok(
      config.command[name].description.length > 0,
      'command ' + name + ' has a description',
    );
  }

  assert.equal(config.skills.paths.length, 1);
  assert.ok(fs.existsSync(path.join(config.skills.paths[0], 'caveman', 'SKILL.md')));

  for (const name of ['cavecrew-investigator', 'cavecrew-builder', 'cavecrew-reviewer']) {
    const agent = config.agent[name];
    assert.ok(agent, name + ' registered');
    assert.equal(agent.mode, 'subagent');
    assert.ok(agent.prompt.length > 0, name + ' has a prompt');
    assert.ok(agent.description.length > 0, name + ' has a description');
  }
  assert.deepEqual(config.agent['cavecrew-investigator'].permission, { edit: 'deny' });
  assert.deepEqual(config.agent['cavecrew-reviewer'].permission, { edit: 'deny' });
  assert.equal(config.agent['cavecrew-builder'].permission, undefined);
});

test('system transform injects the active level and stays silent when off', async () => {
  const { default: plugin } = await loadPlugin();
  const hooks = await plugin({});

  writeLevel('lite');
  const lite = { system: ['base prompt'] };
  await hooks['experimental.chat.system.transform']({}, lite);
  assert.equal(lite.system.length, 1);
  assert.match(lite.system[0], /^base prompt\n\nCAVEMAN MODE ACTIVE — level: lite/);
  assert.ok(lite.system[0].includes('| **lite** |'));

  writeLevel('off');
  const off = { system: ['base prompt'] };
  await hooks['experimental.chat.system.transform']({}, off);
  assert.deepEqual(off.system, ['base prompt']);
});

test('system transform pushes a standalone entry when the system prompt is empty', async () => {
  const { default: plugin } = await loadPlugin();
  const hooks = await plugin({});

  writeLevel('full');
  const output = { system: [] };
  await hooks['experimental.chat.system.transform']({}, output);
  assert.equal(output.system.length, 1);
  assert.match(output.system[0], /^CAVEMAN MODE ACTIVE — level: full/);
});

test('command hook persists levels and ignores other commands', async () => {
  const { default: plugin } = await loadPlugin();
  const hooks = await plugin({});

  await hooks['command.execute.before']({ command: 'caveman', sessionID: 's', arguments: 'ultra' });
  assert.equal(readLevel(), 'ultra');

  await hooks['command.execute.before']({
    command: 'caveman',
    sessionID: 's',
    arguments: 'wenyan',
  });
  assert.equal(readLevel(), 'wenyan-full');

  await hooks['command.execute.before']({ command: 'caveman', sessionID: 's', arguments: '' });
  assert.equal(readLevel(), 'full');

  await hooks['command.execute.before']({ command: 'caveman', sessionID: 's', arguments: 'bogus' });
  assert.equal(readLevel(), 'full');

  await hooks['command.execute.before']({ command: 'caveman-help', sessionID: 's', arguments: '' });
  assert.equal(readLevel(), 'full');

  await hooks['command.execute.before']({ command: 'caveman', sessionID: 's', arguments: 'off' });
  assert.equal(readLevel(), 'off');
});

test('a standalone deactivation message turns caveman off', async () => {
  const { default: plugin } = await loadPlugin();
  const hooks = await plugin({});

  writeLevel('full');
  await hooks['chat.message'](
    { sessionID: 's' },
    { parts: [{ type: 'text', text: 'stop caveman' }] },
  );
  assert.equal(readLevel(), 'off');

  writeLevel('full');
  await hooks['chat.message'](
    { sessionID: 's' },
    { parts: [{ type: 'text', text: 'add a normal mode toggle' }] },
  );
  assert.equal(readLevel(), 'full');

  await hooks['chat.message'](
    { sessionID: 's' },
    { parts: [{ type: 'file', text: 'normal mode' }] },
  );
  assert.equal(readLevel(), 'full');
});
