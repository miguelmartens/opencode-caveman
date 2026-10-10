// caveman — OpenCode plugin.
//
// Injects the caveman ruleset into every chat's system prompt at the active
// level, persists /caveman level switches, answers the natural-language
// deactivation commands, and registers the packaged commands, skills, and
// cavecrew subagents so they work when the package is installed from npm.
//
// One default export serves both OpenCode plugin APIs: V2 validates `id` plus
// `setup(ctx)`; V1 (1.18.29+) calls `server()` for the legacy hooks object.
// Plugin.define is runtime identity, so no @opencode/plugin dependency is
// needed here.

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The shared helpers are CommonJS; bridge to them from this ES module.
const require = createRequire(import.meta.url);
const {
  isDeactivationCommand,
  normalizeLevel,
  readLevel,
  writeLevel,
} = require('../../../hooks/caveman-config.cjs');
const { getLevelInstructions } = require('../../../hooks/caveman-instructions.cjs');
const { parseAgentFile, parseCommandFile, parseSkillFile } = require('./caveman-frontmatter.cjs');

// Read-only by contract; enforce it so a misread prompt cannot edit files.
const READ_ONLY_AGENTS = new Set(['cavecrew-investigator', 'cavecrew-reviewer']);

const COMMAND_DIR = path.resolve(__dirname, '..', '..', 'command');
const AGENT_DIR = path.resolve(__dirname, '..', '..', '..', 'agents');
const SKILL_DIR = path.resolve(__dirname, '..', '..', '..', 'skills');

function markdownFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(dir, file));
  } catch (e) {
    return [];
  }
}

function skillFiles() {
  try {
    return fs.readdirSync(SKILL_DIR).map((entry) => path.join(SKILL_DIR, entry, 'SKILL.md'));
  } catch (e) {
    return [];
  }
}

// V2 command definitions submit their own prompt, so expand the markdown
// template the way V2 expands file-based commands: $ARGUMENTS in place, or a
// blank-line appended argument string when the template has no placeholder.
function expandTemplate(template, args) {
  const text = String(args || '').trim();
  if (template.includes('$ARGUMENTS')) return template.replaceAll('$ARGUMENTS', text);
  return text ? template + '\n\n' + text : template;
}

export default {
  id: 'caveman',

  // OpenCode V2: register the domains and hooks through the plugin context.
  async setup(ctx) {
    // Register the bundled slash commands. V2 runs `execute` instead of a
    // markdown template, so each definition submits its own expanded prompt.
    await ctx.command.transform((editor) => {
      try {
        for (const file of markdownFiles(COMMAND_DIR)) {
          const parsed = parseCommandFile(file);
          if (!parsed || !parsed.template) continue;
          const name = path.basename(file, '.md');
          editor.add({
            name,
            description: parsed.description,
            execute: async ({ sessionID, prompt, delivery }) => {
              const args = String(prompt.text || '');
              if (name === 'caveman') {
                // No argument means "turn it on": full, matching the upstream command.
                const level = args.trim() ? normalizeLevel(args.trim().split(/\s+/)[0]) : 'full';
                if (level) writeLevel(level);
              }
              await ctx.session.prompt({
                ...prompt,
                sessionID,
                text: expandTemplate(parsed.template, args),
                delivery,
              });
            },
          });
        }
      } catch (e) {}
    });

    // Register the bundled skills (directory per skill, SKILL.md inside).
    await ctx.skill.transform((editor) => {
      try {
        for (const file of skillFiles()) {
          if (!fs.existsSync(file)) continue;
          const parsed = parseSkillFile(file);
          if (!parsed) continue;
          const id = path.basename(path.dirname(file));
          editor.add({
            id,
            name: parsed.name || id,
            description: parsed.description,
            path: file,
            content: parsed.content,
          });
        }
      } catch (e) {}
    });

    // Register the cavecrew subagents. V2 has no agent `add`; `update` upserts
    // and seeds the default permissions, so the read-only ones append a deny.
    await ctx.agent.transform((editor) => {
      try {
        for (const file of markdownFiles(AGENT_DIR)) {
          const name = path.basename(file, '.md');
          const parsed = parseAgentFile(file);
          if (!parsed || !parsed.prompt) continue;
          editor.update(name, (agent) => {
            agent.name = parsed.name || name;
            agent.description = parsed.description;
            agent.mode = 'subagent';
            agent.system = parsed.prompt;
            if (READ_ONLY_AGENTS.has(name)) {
              agent.permissions.push({ action: 'edit', resource: '*', effect: 'deny' });
            }
          });
        }
      } catch (e) {}
    });

    // Append the ruleset to the system prompt before every agent-loop request.
    await ctx.session.hook('context', (event) => {
      const level = readLevel();
      if (level === 'off') return;
      event.system.push({ type: 'text', text: getLevelInstructions(level) });
    });

    // "stop caveman" / "normal mode" as a standalone message turns it off;
    // the per-turn injection would otherwise keep caveman on regardless.
    await ctx.session.hook('prompt', (event) => {
      const text = event.prompt && event.prompt.text;
      if (!isDeactivationCommand(text)) return;
      writeLevel('off');
    });
  },

  // OpenCode V1 (1.18.29+): the same behavior through the legacy hooks object.
  async server(input = {}) {
    const client = input && input.client;
    const log = (level, message) => {
      try {
        client && client.app && client.app.log({ body: { service: 'caveman', level, message } });
      } catch (e) {}
    };

    return {
      // Register slash commands, the skills directory, and cavecrew subagents.
      config: async (config) => {
        if (!config.command) config.command = {};
        try {
          for (const file of markdownFiles(COMMAND_DIR)) {
            const parsed = parseCommandFile(file);
            if (parsed && parsed.template) {
              config.command[path.basename(file, '.md')] = parsed;
            }
          }
        } catch (e) {}

        config.skills = config.skills || {};
        config.skills.paths = config.skills.paths || [];
        if (!config.skills.paths.includes(SKILL_DIR)) config.skills.paths.push(SKILL_DIR);

        if (!config.agent) config.agent = {};
        try {
          for (const file of markdownFiles(AGENT_DIR)) {
            const name = path.basename(file, '.md');
            const parsed = parseAgentFile(file);
            if (!parsed || !parsed.prompt) continue;
            config.agent[name] = {
              description: parsed.description,
              mode: 'subagent',
              prompt: parsed.prompt,
            };
            if (READ_ONLY_AGENTS.has(name)) config.agent[name].permission = { edit: 'deny' };
          }
        } catch (e) {}
      },

      // Append the ruleset to the system prompt every turn.
      'experimental.chat.system.transform': async (_input, output) => {
        const level = readLevel();
        if (level === 'off') return;
        const instructions = getLevelInstructions(level);
        if (output.system.length > 0) {
          output.system[output.system.length - 1] += '\n\n' + instructions;
        } else {
          output.system.push(instructions);
        }
      },

      // Persist `/caveman <level>` so the next turn's injection follows it.
      'command.execute.before': async (input) => {
        if (!input || input.command !== 'caveman') return;
        // No argument means "turn it on": full, matching the upstream command.
        const args = String(input.arguments || '').trim();
        const level = args ? normalizeLevel(args.split(/\s+/)[0]) : 'full';
        if (!level) return;
        writeLevel(level);
        log('info', 'caveman level ' + level);
      },

      // "stop caveman" / "normal mode" as a standalone message turns it off;
      // the per-turn injection would otherwise keep caveman on regardless.
      'chat.message': async (_input, output) => {
        const text = (output.parts || [])
          .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
          .map((part) => part.text)
          .join('\n');
        if (!isDeactivationCommand(text)) return;
        writeLevel('off');
        log('info', 'caveman off');
      },
    };
  },
};
