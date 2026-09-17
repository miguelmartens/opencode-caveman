'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  parseAgentFile,
  parseCommandFile,
  parseField,
  splitFrontmatter,
} = require('../.opencode/plugins/caveman-frontmatter.cjs');

function tempFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-fm-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

test('parseCommandFile reads an inline description and the template body', () => {
  const file = tempFile(
    'command.md',
    '---\ndescription: Do a thing\n---\n\nBody line one.\nBody line two.\n',
  );
  assert.deepEqual(parseCommandFile(file), {
    description: 'Do a thing',
    template: 'Body line one.\nBody line two.',
  });
});

test('parseCommandFile tolerates CRLF line endings', () => {
  const file = tempFile('command.md', '---\r\ndescription: CRLF safe\r\n---\r\n\r\nTemplate.\r\n');
  assert.deepEqual(parseCommandFile(file), { description: 'CRLF safe', template: 'Template.' });
});

test('parseAgentFile folds a block-scalar description and keeps the prompt body', () => {
  const file = tempFile(
    'agent.md',
    '---\nname: cavecrew-test\ndescription: >\n  First line of the description.\n  Second line of the description.\n---\n\nPrompt body.\n',
  );
  const parsed = parseAgentFile(file);
  assert.equal(parsed.name, 'cavecrew-test');
  assert.equal(
    parsed.description,
    'First line of the description. Second line of the description.',
  );
  assert.equal(parsed.prompt, 'Prompt body.');
});

test('parseField supports the literal block form', () => {
  const field = parseField('description: |\n  line one\n  line two\n', 'description');
  assert.equal(field, 'line one\nline two');
});

test('files without frontmatter return null', () => {
  const file = tempFile('plain.md', 'No frontmatter here.\n');
  assert.equal(splitFrontmatter('No frontmatter here.'), null);
  assert.equal(parseCommandFile(file), null);
  assert.equal(parseAgentFile(file), null);
});
