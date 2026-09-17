'use strict';

// caveman frontmatter parser.
//
// Kept out of caveman.mjs so the plugin module's only top-level export is the
// plugin function itself. OpenCode's legacy plugin loader treats every
// function exported from a plugin module as a plugin; calling the parser as
// one throws. One plugin-shaped export per module.

const fs = require('fs');

function splitFrontmatter(content) {
  // Tolerate CRLF: a Windows checkout (autocrlf) delivers \r\n, npm ships \n.
  const match = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2].trim() };
}

// Supports `key: value` and the folded/literal block forms (`key: >`, `key: |`)
// that the vendored agent files use for their descriptions.
function parseField(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const index = lines.findIndex((line) => new RegExp('^' + key + ':\\s*').test(line));
  if (index === -1) return undefined;

  const inline = lines[index].replace(new RegExp('^' + key + ':\\s*'), '').trim();
  if (inline && inline !== '>' && inline !== '|') return inline;
  if (!inline) return undefined;

  const block = [];
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      block.push('');
      continue;
    }
    if (!/^\s/.test(line)) break;
    block.push(line.trim());
  }
  while (block.length && block[block.length - 1] === '') block.pop();
  return block.join(inline === '|' ? '\n' : ' ').trim() || undefined;
}

function parseCommandFile(filePath) {
  const parsed = splitFrontmatter(fs.readFileSync(filePath, 'utf8'));
  if (!parsed) return null;
  return {
    description: parseField(parsed.frontmatter, 'description'),
    template: parsed.body,
  };
}

function parseAgentFile(filePath) {
  const parsed = splitFrontmatter(fs.readFileSync(filePath, 'utf8'));
  if (!parsed) return null;
  return {
    name: parseField(parsed.frontmatter, 'name'),
    description: parseField(parsed.frontmatter, 'description'),
    prompt: parsed.body,
  };
}

module.exports = { parseAgentFile, parseCommandFile, parseField, splitFrontmatter };
