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
  const module = await import('../.opencode/plugins/caveman/index.mjs');
  return module;
}

// Minimal stand-in for the OpenCode V2 plugin context: transforms run their
// callback against recording editors, session hooks are captured, and
// session.prompt records what the command executors submit.
function fakeContext() {
  const commands = [];
  const skills = [];
  const agents = [];
  const hooks = {};
  const prompts = [];

  return {
    commands,
    skills,
    agents,
    hooks,
    prompts,
    command: { transform: async (cb) => cb({ add: (definition) => commands.push(definition) }) },
    skill: { transform: async (cb) => cb({ add: (skill) => skills.push(skill) }) },
    agent: {
      transform: async (cb) =>
        cb({
          list: () => agents,
          get: (id) => agents.find((agent) => agent.id === id),
          update: (id, update) => {
            let agent = agents.find((entry) => entry.id === id);
            if (!agent) {
              // Same upsert base OpenCode seeds for a new agent ID.
              agent = {
                id,
                name: id,
                request: { settings: {}, headers: {}, body: {} },
                mode: 'primary',
                hidden: false,
                permissions: [{ action: '*', resource: '*', effect: 'allow' }],
              };
              agents.push(agent);
            }
            update(agent);
          },
        }),
    },
    session: {
      hook: async (name, callback) => {
        hooks[name] = callback;
      },
      prompt: async (input) => {
        prompts.push(input);
      },
    },
  };
}

async function setupV2() {
  const { default: plugin } = await loadPlugin();
  const ctx = fakeContext();
  await plugin.setup(ctx);
  return ctx;
}

test('the plugin module exports one dual V2/V1 definition', async () => {
  const module = await loadPlugin();
  assert.deepEqual(Object.keys(module), ['default']);
  assert.equal(module.default.id, 'caveman');
  assert.equal(typeof module.default.setup, 'function');
  assert.equal(typeof module.default.server, 'function');
});

test('V2 setup registers commands that persist levels and submit the template', async () => {
  const ctx = await setupV2();

  assert.deepEqual(ctx.commands.map((command) => command.name).sort(), [
    'caveman',
    'caveman-commit',
    'caveman-help',
    'caveman-review',
  ]);
  for (const command of ctx.commands) {
    assert.ok(command.description.length > 0, command.name + ' has a description');
    assert.equal(typeof command.execute, 'function');
  }

  const caveman = ctx.commands.find((command) => command.name === 'caveman');
  await caveman.execute({ sessionID: 's', prompt: { text: 'ultra' }, delivery: 'steer' });
  assert.equal(readLevel(), 'ultra');
  assert.equal(ctx.prompts.length, 1);
  assert.equal(ctx.prompts[0].sessionID, 's');
  assert.equal(ctx.prompts[0].delivery, 'steer');
  assert.match(ctx.prompts[0].text, /^Switch to caveman ultra mode\./);

  await caveman.execute({ sessionID: 's', prompt: { text: 'wenyan' }, delivery: 'steer' });
  assert.equal(readLevel(), 'wenyan-full');

  await caveman.execute({ sessionID: 's', prompt: { text: '' }, delivery: 'steer' });
  assert.equal(readLevel(), 'full');

  await caveman.execute({ sessionID: 's', prompt: { text: 'bogus' }, delivery: 'steer' });
  assert.equal(readLevel(), 'full');
  assert.equal(ctx.prompts.length, 4);

  const help = ctx.commands.find((command) => command.name === 'caveman-help');
  await help.execute({ sessionID: 's', prompt: { text: '' }, delivery: 'steer' });
  assert.equal(readLevel(), 'full');
  assert.match(ctx.prompts[4].text, /^Use the caveman-help skill\./);

  // Templates without $ARGUMENTS append non-empty arguments after a blank line.
  await help.execute({ sessionID: 's', prompt: { text: 'extra' }, delivery: 'steer' });
  assert.match(
    ctx.prompts[5].text,
    /card once\. Do not change the caveman level or write state\.\n\nextra$/,
  );
});

test('V2 setup registers the bundled skills without frontmatter', async () => {
  const ctx = await setupV2();

  assert.deepEqual(ctx.skills.map((skill) => skill.id).sort(), [
    'caveman',
    'caveman-commit',
    'caveman-help',
    'caveman-review',
  ]);
  for (const skill of ctx.skills) {
    assert.ok(Array.isArray(skill.content) === false && skill.content.length > 0);
    assert.equal(skill.content.startsWith('---'), false, skill.id + ' content has no frontmatter');
    assert.ok(skill.name.length > 0, skill.id + ' has a name');
    assert.ok(skill.description.length > 0, skill.id + ' has a description');
    assert.ok(fs.existsSync(skill.path), skill.id + ' path exists');
  }
});

test('V2 setup upserts the cavecrew subagents and denies edit for read-only ones', async () => {
  const ctx = await setupV2();

  assert.deepEqual(ctx.agents.map((agent) => agent.id).sort(), [
    'cavecrew-builder',
    'cavecrew-investigator',
    'cavecrew-reviewer',
  ]);
  for (const agent of ctx.agents) {
    assert.equal(agent.mode, 'subagent');
    assert.ok(agent.system.length > 0, agent.id + ' has a system prompt');
    assert.ok(agent.description.length > 0, agent.id + ' has a description');
  }

  const deniesEdit = (agent) =>
    agent.permissions.some(
      (rule) => rule.action === 'edit' && rule.resource === '*' && rule.effect === 'deny',
    );
  const byId = (id) => ctx.agents.find((agent) => agent.id === id);
  assert.ok(deniesEdit(byId('cavecrew-investigator')));
  assert.ok(deniesEdit(byId('cavecrew-reviewer')));
  assert.equal(deniesEdit(byId('cavecrew-builder')), false);
});

test('V2 context hook injects the active level and stays silent when off', async () => {
  const ctx = await setupV2();

  writeLevel('lite');
  const lite = { system: [] };
  await ctx.hooks.context(lite);
  assert.equal(lite.system.length, 1);
  assert.equal(lite.system[0].type, 'text');
  assert.match(lite.system[0].text, /^CAVEMAN MODE ACTIVE — level: lite/);
  assert.ok(lite.system[0].text.includes('| **lite** |'));

  writeLevel('off');
  const off = { system: [] };
  await ctx.hooks.context(off);
  assert.deepEqual(off.system, []);
});

test('V2 prompt hook turns caveman off on a standalone deactivation message', async () => {
  const ctx = await setupV2();

  writeLevel('full');
  await ctx.hooks.prompt({ prompt: { text: 'stop caveman' } });
  assert.equal(readLevel(), 'off');

  writeLevel('full');
  await ctx.hooks.prompt({ prompt: { text: 'add a normal mode toggle' } });
  assert.equal(readLevel(), 'full');

  await ctx.hooks.prompt({ prompt: { text: 'normal mode' } });
  assert.equal(readLevel(), 'off');
});

test('V1 server returns the legacy hooks object with the same behavior', async () => {
  const { default: plugin } = await loadPlugin();
  const hooks = await plugin.server({});

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

  writeLevel('full');
  const empty = { system: [] };
  await hooks['experimental.chat.system.transform']({}, empty);
  assert.equal(empty.system.length, 1);
  assert.match(empty.system[0], /^CAVEMAN MODE ACTIVE — level: full/);

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
