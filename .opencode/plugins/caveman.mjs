// caveman — OpenCode plugin.
//
// Injects the caveman ruleset into every chat's system prompt at the active
// level, persists /caveman level switches, answers the natural-language
// deactivation commands, and registers the packaged commands, skills, and
// cavecrew subagents so they work when the package is installed from npm.
//
// OpenCode loads this as a server plugin — add it to your opencode.json:
//   { "plugin": ["@miguelmartens/opencode-caveman"] }

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
} = require('../../hooks/caveman-config.cjs');
const { getLevelInstructions } = require('../../hooks/caveman-instructions.cjs');
const { parseAgentFile, parseCommandFile } = require('./caveman-frontmatter.cjs');

// Read-only by contract; enforce it so a misread prompt cannot edit files.
const READ_ONLY_AGENTS = new Set(['cavecrew-investigator', 'cavecrew-reviewer']);

export default async ({ client } = {}) => {
  const log = (level, message) => {
    try {
      client && client.app && client.app.log({ body: { service: 'caveman', level, message } });
    } catch (e) {}
  };

  return {
    // Register slash commands, the skills directory, and cavecrew subagents.
    config: async (config) => {
      if (!config.command) config.command = {};
      const commandDir = path.join(__dirname, '..', 'command');
      try {
        for (const file of fs.readdirSync(commandDir).filter((f) => f.endsWith('.md'))) {
          const parsed = parseCommandFile(path.join(commandDir, file));
          if (parsed && parsed.template) {
            config.command[path.basename(file, '.md')] = parsed;
          }
        }
      } catch (e) {}

      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      const skillsDir = path.resolve(__dirname, '..', '..', 'skills');
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);

      if (!config.agent) config.agent = {};
      const agentDir = path.resolve(__dirname, '..', '..', 'agents');
      try {
        for (const file of fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'))) {
          const name = path.basename(file, '.md');
          const parsed = parseAgentFile(path.join(agentDir, file));
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
};
