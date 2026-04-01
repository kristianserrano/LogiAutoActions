const test = require('node:test');
const assert = require('node:assert/strict');

const { stripHtml, parseShortcutEntries } = require('../src/shortcut-extraction');

test('stripHtml removes scripts and tags', () => {
  const input = '<div>Copy: <b>Ctrl+C</b></div><script>alert(1)</script>';
  const output = stripHtml(input);
  assert.match(output, /Ctrl\+C/);
  assert.doesNotMatch(output, /alert\(1\)/);
});

test('parseShortcutEntries extracts and normalizes shortcuts', () => {
  const input = [
    'Copy\tCtrl + C',
    'Paste\tCommand + V',
    'Duplicate\tControl+Shift+D',
    'Paste\tCommand + V'
  ].join('\n');

  const entries = parseShortcutEntries(input);
  assert.deepEqual(entries.map((item) => item.shortcut), ['Ctrl+C', 'Cmd+V', 'Ctrl+Shift+D']);
});
