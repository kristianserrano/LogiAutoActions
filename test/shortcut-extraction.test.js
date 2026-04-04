const test = require('node:test');
const assert = require('node:assert/strict');

const { stripHtml, parseShortcutEntries, extractPageMetadata } = require('../src/shortcut-extraction');

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

test('parseShortcutEntries normalizes unicode modifier shortcuts', () => {
  const input = [
    'Select all\t⌘+a',
    'Submit\t⌃ + Enter',
    'Previous item\t⇧+k'
  ].join('\n');

  const entries = parseShortcutEntries(input);
  assert.deepEqual(entries.map((item) => item.shortcut), ['Cmd+a', 'Ctrl+Enter', 'Shift+k']);
});

test('parseShortcutEntries maps HTML table action names to shortcut entries', () => {
  const html = [
    '<table>',
    '  <tr><th>Action</th><th>Shortcut</th></tr>',
    '  <tr><td>Compose a new note</td><td><strong>c</strong></td></tr>',
    '  <tr><td>Search notes</td><td><strong>/</strong></td></tr>',
    '  <tr><td>Move note to next/previous position</td><td><strong>Shift + j</strong> / <strong>k</strong></td></tr>',
    '  <tr><td>Indent / dedent list item</td><td><strong>Ctrl + ]</strong> / <strong>[</strong></td></tr>',
    '</table>'
  ].join('');

  const entries = parseShortcutEntries(html);
  assert.deepEqual(entries, [
    { shortcut: 'c', context: 'Compose a new note' },
    { shortcut: '/', context: 'Search notes' },
    { shortcut: 'Shift+j', context: 'Move note to next position' },
    { shortcut: 'Shift+k', context: 'Move note to previous position' },
    { shortcut: 'Ctrl+]', context: 'Indent list item' },
    { shortcut: 'Ctrl+[', context: 'dedent list item' }
  ]);
});

test('extractPageMetadata infers plugin name and description from help page HTML', () => {
  const html = [
    '<!doctype html><html><head>',
    '<title>Keyboard shortcuts for Google Keep - Computer - Google Keep Help</title>',
    '<meta name="description" content="Use keyboard shortcuts in Google Keep to navigate and edit."/>',
    '</head><body><h1>Keyboard shortcuts for Google Keep</h1></body></html>'
  ].join('');

  const meta = extractPageMetadata(html);
  assert.equal(meta.suggestedPluginName, 'Google Keep');
  assert.equal(meta.suggestedDescription, 'Use keyboard shortcuts in Google Keep to navigate and edit.');
});
